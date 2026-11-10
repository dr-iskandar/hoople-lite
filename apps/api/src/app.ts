import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import type { AuthSettings, DbPool, OidcProvider } from './creator-auth.js';
import { registerCreatorRoutes } from './creator-routes.js';
import { registerOrganizationRoutes } from './organization-routes.js';
import { registerCreatorEngineRoutes } from './creator-engine-routes.js';
import { registerBillingRoutes } from './billing-routes.js';
import type {HopayGateway,HopaySettings} from './hopay.js';

export interface ReadyDatabase {
  query(sql: string): Promise<unknown>;
}

export function buildApp(database?: ReadyDatabase, identity?: {
  settings?: AuthSettings;
  provider?: OidcProvider;
}, billing?:{settings?:HopaySettings;gateway?:HopayGateway}) {
  const app = Fastify({ logger: false, bodyLimit: 512 * 1024, requestTimeout: 15_000 });
  void app.register(cookie);

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
  registerBillingRoutes(app,pool,identity?.settings,billing?.settings,billing?.gateway);
  return app;
}
