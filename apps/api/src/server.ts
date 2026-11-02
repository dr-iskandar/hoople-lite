import { buildApp } from './app.js';
import { readConfig } from './config.js';
import { createPool } from './db/pool.js';

const config = readConfig();
const pool = createPool(config.databaseUrl);
const app = buildApp(pool);

app.addHook('onClose', async () => { await pool?.end(); });

const stop = async () => {
  try { await app.close(); process.exitCode = 0; }
  catch { process.exitCode = 1; }
};
process.once('SIGTERM', () => { void stop(); });
process.once('SIGINT', () => { void stop(); });

try {
  await app.listen({ host: config.host, port: config.port });
  console.info(`Hoople lite API listening on ${config.host}:${config.port}`);
  if (!pool) console.warn('DATABASE_URL not set: readiness endpoint will return 503');
} catch (error) {
  console.error('API startup failed', error instanceof Error ? error.message : 'unknown error');
  await app.close();
  process.exitCode = 1;
}
