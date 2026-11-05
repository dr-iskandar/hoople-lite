import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import type { AuthSettings, DbPool, OidcProvider } from './creator-auth.js';
import { registerCreatorRoutes } from './creator-routes.js';
import { registerOrganizationRoutes } from './organization-routes.js';
import { registerCreatorEngineRoutes } from './creator-engine-routes.js';

export interface ReadyDatabase {
  query(sql: string): Promise<unknown>;
}

export function buildApp(database?: ReadyDatabase, identity?: {
  settings?: AuthSettings;
  provider?: OidcProvider;
}) {
  const app = Fastify({ logger: false, bodyLimit: 512 * 1024, requestTimeout: 15_000 });
  void app.register(cookie);
  // JSON API responses (including errors and redirects) must not be cached,
  // embedded, MIME-sniffed or reveal referrers. TLS termination and network
  // rate limiting are still the responsibility of the deployment proxy.
  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('Cache-Control', 'no-store');
    reply.header('Pragma', 'no-cache');
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (process.env.NODE_ENV === 'production') {
      reply.header('Strict-Transport-Security', 'max-age=31536000');
    }
    return payload;
  });

  app.get('/health/live', async () => ({
    service: 'hoople-lite-api',
    status: 'ok',
  }));

  app.get('/health/ready', async (_request, reply) => {
    if (!database) return reply.code(503).send({ status: 'not_ready', dependency: 'database' });
    try {
      await database.query('SELECT 1');
      return { status: 'ready' };
    } catch {
      // Never return connection strings or raw DB failures to public callers.
      return reply.code(503).send({ status: 'not_ready', dependency: 'database' });
    }
  });

  const pool = database && 'connect' in database ? database as ReadyDatabase & DbPool : undefined;
  registerCreatorRoutes(app,pool,identity?.settings,identity?.provider);
  registerOrganizationRoutes(app,pool,identity?.settings);
  registerCreatorEngineRoutes(app,pool,identity?.settings);
  return app;
}
