const DEFAULT_PORT = Number(process.env.SERVER_PORT ?? 4000);
const DEFAULT_HOST = process.env.SERVER_HOST ?? '0.0.0.0';
const DEFAULT_CORS_ORIGINS = ['http://localhost:3000', 'http://localhost:3001'];

export type AppConfig = {
  port: number;
  host: string;
  corsOrigins: string[];
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
};

export function buildConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: env.SERVER_PORT ? Number(env.SERVER_PORT) : DEFAULT_PORT,
    host: env.SERVER_HOST ?? DEFAULT_HOST,
    corsOrigins:
      env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean) ?? DEFAULT_CORS_ORIGINS,
    logLevel: (env.LOG_LEVEL as AppConfig['logLevel']) ?? 'info'
  };
}
