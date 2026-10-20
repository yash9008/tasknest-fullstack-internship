import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';

// PostgreSQL DATE has no timezone. Preserve its text form rather than allowing
// node-postgres to construct a local-midnight Date that can shift to yesterday.
export const postgresTypes = {
  getTypeParser(oid, format = 'text') {
    return oid === 1082 && format === 'text' ? value => value : pg.types.getTypeParser(oid, format);
  },
};

/** Both adapters expose parameterized query and a transaction-bound query client. */
export async function openDatabase({ dataDir = './data/tasknest', databaseUrl = '' } = {}) {
  let db;
  if (databaseUrl) {
    const pool = new pg.Pool({ connectionString: databaseUrl, max: 5, types: postgresTypes,
      connectionTimeoutMillis: 5000, options: '-c timezone=UTC -c statement_timeout=10000' });
    pool.on('error', () => console.error('Database pool connection error'));
    db = {
      kind: 'postgresql',
      query: (sql, values = []) => pool.query(sql, values),
      async transaction(work) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const result = await work({ query: (sql, values = []) => client.query(sql, values) });
          await client.query('COMMIT');
          return result;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally { client.release(); }
      },
      close: () => pool.end(),
    };
  } else {
    const engine = await PGlite.create(dataDir);
    await engine.query("SET TIME ZONE 'UTC'");
    db = {
      kind: 'pglite',
      query: (sql, values = []) => engine.query(sql, values),
      transaction: work => engine.transaction(tx => work({ query: (sql, values = []) => tx.query(sql, values) })),
      close: () => engine.close(),
    };
  }
  try {
    const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
    await db.transaction(async tx => {
      // A migration record prevents accidental re-creation or silent schema drift.
      await tx.query('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
      const { rows } = await tx.query('SELECT version FROM schema_migrations ORDER BY version');
      if (rows.some(row => row.version !== 1)) throw new Error('Unsupported database schema version');
      if (!rows.length) {
        // No parameters or external input are interpolated into the static migration.
        for (const statement of schema.split(';').filter(part => part.trim())) await tx.query(statement);
        await tx.query('INSERT INTO schema_migrations(version) VALUES (1)');
      }
    });
    return db;
  } catch (error) { await db.close(); throw error; }
}
