const DEFAULT_PORT = Number(process.env.SERVER_PORT ?? 4000);
const DEFAULT_HOST = process.env.SERVER_HOST ?? '0.0.0.0';
const DEFAULT_CORS_ORIGINS = ['http://localhost:3000', 'http://localhost:3001'];
const DEFAULT_JWT_SECRET = process.env.JWT_SECRET ?? 'supermock-dev-secret';
const DEFAULT_JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? '15m';
const DEFAULT_JWT_REFRESH_TTL = process.env.JWT_REFRESH_TTL ?? '7d';
const DEFAULT_BCRYPT_SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS ? Number(process.env.BCRYPT_SALT_ROUNDS) : 12;

type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';

export type JwtConfig = {
  secret: string;
  accessTokenTtl: string;
  refreshTokenTtl: string;
};

export type PasswordConfig = {
  saltRounds: number;
};

export type AppConfig = {
  port: number;
  host: string;
  corsOrigins: string[];
  logLevel: LogLevel;
  jwt: JwtConfig;
  password: PasswordConfig;
};

export function buildConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: env.SERVER_PORT ? Number(env.SERVER_PORT) : DEFAULT_PORT,
    host: env.SERVER_HOST ?? DEFAULT_HOST,
    corsOrigins:
      env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean) ?? DEFAULT_CORS_ORIGINS,
    logLevel: (env.LOG_LEVEL as LogLevel) ?? 'info',
    jwt: {
      secret: env.JWT_SECRET ?? DEFAULT_JWT_SECRET,
      accessTokenTtl: env.JWT_ACCESS_TTL ?? DEFAULT_JWT_ACCESS_TTL,
      refreshTokenTtl: env.JWT_REFRESH_TTL ?? DEFAULT_JWT_REFRESH_TTL
    },
    password: {
      saltRounds: env.BCRYPT_SALT_ROUNDS ? Number(env.BCRYPT_SALT_ROUNDS) : DEFAULT_BCRYPT_SALT_ROUNDS
    }
  };
}
