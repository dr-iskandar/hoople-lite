export interface ApiConfig {
  host: string;
  port: number;
  databaseUrl?: string;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const rawPort = env.PORT ?? '4000';
  const port = Number(rawPort);
  if (!/^\d+$/.test(rawPort) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer from 1 to 65535');
  }
  return {
    host: env.HOST?.trim() || '127.0.0.1',
    port,
    databaseUrl: env.DATABASE_URL?.trim() || undefined,
  };
}
