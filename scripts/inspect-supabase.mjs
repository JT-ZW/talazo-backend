// Read-only inventory. Credentials stay in the process environment.
import { mkdir, writeFile } from 'node:fs/promises';
const url = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error('Supabase server credentials are required');
const headers = { apikey: key, Authorization: `Bearer ${key}` };
const response = await fetch(`${url}/rest/v1/`, { headers });
if (!response.ok) throw new Error(`Schema inspection returned ${response.status}`);
const schema = await response.json();
const tables = Object.entries(schema.definitions || {}).map(([name, definition]) => ({
  name, required: definition.required || [], columns: definition.properties
}));
const counts = [];
for (const { name } of tables) {
  const result = await fetch(`${url}/rest/v1/${name}?select=*&limit=0`, {
    method: 'HEAD', headers: { ...headers, Prefer: 'count=exact' }
  });
  counts.push({ table: name, status: result.status, count: result.headers.get('content-range')?.split('/')[1] ?? null });
}
await mkdir('docs/audits', { recursive: true });
await writeFile('docs/audits/supabase-schema.json', JSON.stringify({
  inspectedAt: new Date().toISOString(), method: 'Read-only PostgREST OpenAPI and row counts; no row contents',
  limitations: 'Does not expose RLS policy definitions, indexes, triggers, check constraints or private schemas.', tables, counts
}, null, 2));
console.log(JSON.stringify({ tables: tables.length, counts }, null, 2));
