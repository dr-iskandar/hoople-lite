import { buildApp } from './app.js';
import { readConfig } from './config.js';
import { createPool } from './db/pool.js';
import { createOidcProvider, parseAuthSettings } from './creator-auth.js';
import {parseHopaySettings} from './hopay.js';

const config = readConfig();
const authSettings = parseAuthSettings();
const hopaySettings = parseHopaySettings();
if (hopaySettings && authSettings && new URL(hopaySettings.finishUrl).origin !== authSettings.webOrigin) {
  throw new Error('HoPay finish URL must use the configured WEB_ORIGIN');
}
const pool = createPool(config.databaseUrl);
const app = buildApp(pool, { settings: authSettings,
  provider: authSettings ? createOidcProvider(authSettings) : undefined },{settings:hopaySettings});

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
  if (!authSettings) console.warn('OIDC not configured: creator login will return 503');
  if (!hopaySettings) console.warn('HoPay staging not configured: checkout will return 503');
} catch (error) {
  console.error('API startup failed', error instanceof Error ? error.message : 'unknown error');
  await app.close();
  process.exitCode = 1;
}
