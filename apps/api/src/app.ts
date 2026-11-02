import Fastify from 'fastify';

export interface ReadyDatabase {
  query(sql: string): Promise<unknown>;
}

export function buildApp(database?: ReadyDatabase) {
  const app = Fastify({ logger: false, bodyLimit: 512 * 1024, requestTimeout: 15_000 });

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

  // No protected CRUD until login, RBAC, and tenant membership checks exist.
  return app;
}
