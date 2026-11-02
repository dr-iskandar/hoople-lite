import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { runMigrations } from './migrate.js';

// Never run this helper against staging/production. Ephemeral GitHub Actions DB only.
const databaseUrl = process.env.DATABASE_URL;
if (process.env.CI !== 'true' || !databaseUrl ||
  new URL(databaseUrl).hostname !== 'localhost' ||
  new URL(databaseUrl).pathname !== '/hoople_lite_ci') {
  throw new Error('CI database setup is restricted to local hoople_lite_ci');
}
const pool = new Pool({connectionString:databaseUrl,max:1});
try {
  await pool.query("CREATE ROLE hoople_api LOGIN PASSWORD 'ci-only-password'");
  await runMigrations(databaseUrl);
  const sql = await readFile(new URL('../../ops/grant_runtime.sql', import.meta.url),'utf8');
  await pool.query(sql);
  console.info('CI PostgreSQL roles, migrations and grants ready');
} finally {
  await pool.end();
}
