import { randomUUID } from 'node:crypto';
import { notFound } from './errors.js';
const iso = value => new Date(value).toISOString();
export const projectJSON = row => ({ id: row.id, name: row.name, description: row.description,
  createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) });
export const taskJSON = row => ({ id: row.id, projectId: row.project_id, title: row.title,
  description: row.description, status: row.status, priority: row.priority,
  dueDate: row.due_date ? (typeof row.due_date === 'string' ? row.due_date.slice(0, 10) : iso(row.due_date).slice(0, 10)) : '',
  createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) });
export function repository(db) {
  async function project(userId, id, tx = db, lock = false) {
    const { rows } = await tx.query(`SELECT * FROM projects WHERE id=$1 AND owner_id=$2${lock ? ' FOR UPDATE' : ''}`, [id, userId]);
    if (!rows[0]) throw notFound();
    return rows[0];
  }
  async function task(userId, id, tx = db, lock = false) {
    const { rows } = await tx.query(`SELECT t.* FROM tasks t JOIN projects p ON p.id=t.project_id
      WHERE t.id=$1 AND p.owner_id=$2${lock ? ' FOR UPDATE OF t, p' : ''}`, [id, userId]);
    if (!rows[0]) throw notFound();
    return rows[0];
  }
  return {
    project, task,
    async dashboard(userId) {
      const { rows } = await db.query(`SELECT
        (SELECT count(*)::int FROM projects WHERE owner_id=$1) AS projects,
        count(t.id)::int AS tasks,
        count(t.id) FILTER (WHERE t.status='todo')::int AS todo,
        count(t.id) FILTER (WHERE t.status='in_progress')::int AS in_progress,
        count(t.id) FILTER (WHERE t.status='done')::int AS done,
        count(t.id) FILTER (WHERE t.status!='done' AND t.due_date < (now() AT TIME ZONE 'UTC')::date)::int AS overdue
        FROM tasks t JOIN projects p ON p.id=t.project_id WHERE p.owner_id=$1`, [userId]);
      const row = rows[0];
      return { projects: row.projects, tasks: row.tasks, todo: row.todo, inProgress: row.in_progress, done: row.done, overdue: row.overdue };
    },
    async projects(userId, { page, limit, offset }) {
      // A single SQL snapshot keeps the count and page consistent under concurrent writes.
      const { rows } = await db.query(`WITH owned AS (SELECT * FROM projects WHERE owner_id=$1),
        selected AS (SELECT * FROM owned ORDER BY created_at DESC, id DESC LIMIT $2 OFFSET $3)
        SELECT (SELECT count(*)::int FROM owned) AS total,
          COALESCE((SELECT json_agg(selected ORDER BY created_at DESC, id DESC) FROM selected), '[]'::json) AS items`, [userId, limit, offset]);
      return { data: rows[0].items.map(projectJSON), pagination: { page, limit, total: rows[0].total } };
    },
    async createProject(userId, data) {
      const { rows } = await db.query('INSERT INTO projects(id,owner_id,name,description) VALUES ($1,$2,$3,$4) RETURNING *',
        [randomUUID(), userId, data.name, data.description ?? '']);
      return projectJSON(rows[0]);
    },
    async updateProject(userId, id, data) {
      return db.transaction(async tx => {
        const current = await project(userId, id, tx, true);
        const { rows } = await tx.query('UPDATE projects SET name=$1,description=$2,updated_at=clock_timestamp() WHERE id=$3 AND owner_id=$4 RETURNING *',
          [data.name ?? current.name, data.description ?? current.description, id, userId]);
        return projectJSON(rows[0]);
      });
    },
    async deleteProject(userId, id) {
      const { rows } = await db.query('DELETE FROM projects WHERE id=$1 AND owner_id=$2 RETURNING id', [id, userId]);
      if (!rows[0]) throw notFound();
    },
    async tasks(userId, id, filters) {
      return db.transaction(async tx => {
        await project(userId, id, tx, true);
        const values = [id], where = ['project_id=$1'];
        for (const field of ['status', 'priority']) if (filters[field] !== undefined) {
          values.push(filters[field]); where.push(`${field}=$${values.length}`);
        }
        if (filters.q) { values.push(filters.q); where.push(`position(lower($${values.length}) in lower(title)) > 0`); }
        values.push(filters.limit, filters.offset);
        const { rows } = await tx.query(`WITH filtered AS (SELECT * FROM tasks WHERE ${where.join(' AND ')}),
          selected AS (SELECT * FROM filtered ORDER BY created_at DESC,id DESC LIMIT $${values.length - 1} OFFSET $${values.length})
          SELECT (SELECT count(*)::int FROM filtered) AS total,
            COALESCE((SELECT json_agg(selected ORDER BY created_at DESC,id DESC) FROM selected), '[]'::json) AS items`, values);
        return { data: rows[0].items.map(taskJSON), pagination: { page: filters.page, limit: filters.limit, total: rows[0].total } };
      });
    },
    async createTask(userId, id, data) {
      return db.transaction(async tx => {
        await project(userId, id, tx, true);
        const { rows } = await tx.query(`INSERT INTO tasks(id,project_id,title,description,status,priority,due_date)
          VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [randomUUID(), id, data.title, data.description ?? '',
          data.status ?? 'todo', data.priority ?? 'normal', data.dueDate ?? null]);
        return taskJSON(rows[0]);
      });
    },
    async updateTask(userId, id, data) {
      return db.transaction(async tx => {
        const current = taskJSON(await task(userId, id, tx, true)), next = { ...current, ...data };
        const { rows } = await tx.query(`UPDATE tasks SET title=$1,description=$2,status=$3,priority=$4,due_date=$5,
          updated_at=clock_timestamp() WHERE id=$6 RETURNING *`, [next.title,next.description,next.status,next.priority,next.dueDate || null,id]);
        return taskJSON(rows[0]);
      });
    },
    async deleteTask(userId, id) {
      const { rows } = await db.query(`DELETE FROM tasks t USING projects p WHERE t.project_id=p.id AND t.id=$1 AND p.owner_id=$2 RETURNING t.id`, [id,userId]);
      if (!rows[0]) throw notFound();
    },
  };
}
