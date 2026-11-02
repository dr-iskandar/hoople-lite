import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { readConfig } from '../config.js';

export async function runMigrations(databaseUrl: string) {
  const directory = fileURLToPath(new URL('../../migrations/', import.meta.url));
  const filenames = (await readdir(directory)).filter(name => /^\d+_[a-z0-9_-]+\.sql$/.test(name)).sort();
  const pool = new Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5_000 });
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('hoople-lite-schema-migrations'))");
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      checksum text NOT NULL,
      executed_at timestamptz NOT NULL DEFAULT now()
    )`);
    const existing = await client.query<{version:string;checksum:string}>('SELECT version, checksum FROM schema_migrations');
    const applied = new Map(existing.rows.map(row => [row.version, row.checksum]));

    for (const filename of filenames) {
      const sql = await readFile(new URL(`../../migrations/${filename}`, import.meta.url), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      if (applied.has(filename)) {
        if (applied.get(filename) !== checksum) throw new Error(`Previously applied migration changed: ${filename}`);
        continue;
      }
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(version,checksum) VALUES ($1,$2)', [filename, checksum]);
    }
    await client.query('COMMIT');
    return { total: filenames.length, applied: applied.size };
  } catch (error) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch { /* preserve original error */ }
    }
    throw error;
  } finally {
    client?.release();
    await pool.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const databaseUrl = readConfig().databaseUrl;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required to run migrations');
    process.exitCode = 1;
  } else {
    runMigrations(databaseUrl).then(
      result => console.info(`Migration files checked: ${result.total}`),
      error => { console.error('Migration failed:',error instanceof Error ? error.message : 'unknown error'); process.exitCode = 1; },
    );
  }
}
