import { ApiError } from './errors.js';
const fail = (field, message) => { throw new ApiError(400, 'VALIDATION_ERROR', 'Please check the supplied fields.', { [field]: message }); };
export function uuid(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) fail('id', 'Use a valid UUID.');
  return value.toLowerCase();
}
function text(value, field, max, required = true) {
  if (typeof value !== 'string') fail(field, 'Must be a string.');
  const normalized = value.trim();
  if ((required && !normalized) || normalized.length > max) fail(field, `Use ${required ? '1' : '0'} to ${max} characters.`);
  return normalized;
}
export function email(value) {
  const result = text(value, 'email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) fail('email', 'Use a valid email address.');
  return result;
}
function enumValue(value, field, allowed) {
  if (!allowed.includes(value)) fail(field, `Use one of: ${allowed.join(', ')}.`);
  return value;
}
function date(value) {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1) fail('dueDate', 'Use a valid YYYY-MM-DD date or null.');
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) fail('dueDate', 'Use a real calendar date.');
  return value;
}
export function body(value, kind, partial = false) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('body', 'Use a JSON object.');
  const rules = {
    register: { name: v => text(v, 'name', 80), email, password: password },
    login: { email, password: password },
    project: { name: v => text(v, 'name', 80), description: v => text(v, 'description', 2000, false) },
    task: { title: v => text(v, 'title', 200), description: v => text(v, 'description', 2000, false),
      status: v => enumValue(v, 'status', ['todo', 'in_progress', 'done']),
      priority: v => enumValue(v, 'priority', ['low', 'normal', 'high']), dueDate: date },
  }[kind];
  const keys = Object.keys(value);
  for (const key of keys) if (!Object.hasOwn(rules, key)) fail(key, 'This field is not allowed.');
  if (partial && !keys.length) fail('body', 'Supply at least one editable field.');
  const mandatory = { register: ['name', 'email', 'password'], login: ['email', 'password'], project: ['name'], task: ['title'] }[kind];
  if (!partial) for (const key of mandatory) if (!Object.hasOwn(value, key)) fail(key, 'This field is required.');
  return Object.fromEntries(keys.map(key => [key, rules[key](value[key])]));
}
function password(value) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128) fail('password', 'Use 12 to 128 characters. Spaces are preserved.');
  return value;
}
export function query(value, task = false) {
  const allowed = task ? ['page', 'limit', 'q', 'status', 'priority'] : ['page', 'limit'];
  for (const key of Object.keys(value)) if (!allowed.includes(key) || typeof value[key] !== 'string') fail(key, 'Invalid query parameter.');
  const integer = (field, fallback, max) => {
    if (value[field] === undefined) return fallback;
    if (!/^[1-9]\d*$/.test(value[field]) || !Number.isSafeInteger(Number(value[field])) || Number(value[field]) > max) fail(field, `Use an integer between 1 and ${max}.`);
    return Number(value[field]);
  };
  const page = integer('page', 1, 1000000), limit = integer('limit', 20, 100);
  return { page, limit, offset: (page - 1) * limit,
    ...(value.q === undefined ? {} : { q: text(value.q, 'q', 200, false) }),
    ...(value.status === undefined ? {} : { status: enumValue(value.status, 'status', ['todo', 'in_progress', 'done']) }),
    ...(value.priority === undefined ? {} : { priority: enumValue(value.priority, 'priority', ['low', 'normal', 'high']) }) };
}
