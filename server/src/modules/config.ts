const DEFAULT_PORT = Number(process.env.SERVER_PORT ?? 4000);
const DEFAULT_HOST = process.env.SERVER_HOST ?? '0.0.0.0';
const DEFAULT_CORS_ORIGINS = ['http://localhost:3000', 'http://localhost:3001'];
const DEVELOPMENT_JWT_SECRET = 'supermock-dev-secret';
const DEFAULT_JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? '15m';
const DEFAULT_JWT_REFRESH_TTL = process.env.JWT_REFRESH_TTL ?? '7d';
const DEFAULT_BCRYPT_SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS ? Number(process.env.BCRYPT_SALT_ROUNDS) : 12;
const DEFAULT_RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX ? Number(process.env.RATE_LIMIT_MAX) : 100;
const DEFAULT_RATE_LIMIT_WINDOW = process.env.RATE_LIMIT_WINDOW ?? '1 minute';

type RateLimitSettings = {
  max: number;
  timeWindow: string;
};

type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';

export type JwtConfig = {
  secret: string;
  accessTokenTtl: string;
  refreshTokenTtl: string;
};

export type PasswordConfig = {
  saltRounds: number;
};

export type DailyCoSettings = {
  enabled: boolean;
  apiKey: string;
  domain: string;
};

export type AppConfig = {
  port: number;
  host: string;
  corsOrigins: string[];
  logLevel: LogLevel;
  jwt: JwtConfig;
  password: PasswordConfig;
  dailyCo: DailyCoSettings;
  rateLimit: {
    global: RateLimitSettings;
    critical: RateLimitSettings;
  };
};

export function buildConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV ?? 'development';
  const isDevelopment = nodeEnv === 'development';

  const rawJwtSecret = env.JWT_SECRET ?? (isDevelopment ? DEVELOPMENT_JWT_SECRET : undefined);
  const jwtSecret = typeof rawJwtSecret === 'string' ? rawJwtSecret.trim() : '';

  if (!jwtSecret) {
    throw new Error('JWT_SECRET must be provided when NODE_ENV is not "development".');
  }

  const dailyCoApiKey = env.DAILY_CO_API_KEY ?? '';
  const dailyCoDomain = env.DAILY_CO_DOMAIN ?? '';
  const dailyCoEnabled = Boolean(dailyCoApiKey && dailyCoDomain);
  const parseMax = (value: string | undefined, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  return {
    port: env.SERVER_PORT ? Number(env.SERVER_PORT) : DEFAULT_PORT,
    host: env.SERVER_HOST ?? DEFAULT_HOST,
    corsOrigins:
      env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean) ?? DEFAULT_CORS_ORIGINS,
    logLevel: (env.LOG_LEVEL as LogLevel) ?? 'info',
    jwt: {
      secret: jwtSecret,
      accessTokenTtl: env.JWT_ACCESS_TTL ?? DEFAULT_JWT_ACCESS_TTL,
      refreshTokenTtl: env.JWT_REFRESH_TTL ?? DEFAULT_JWT_REFRESH_TTL
    },
    password: {
      saltRounds: env.BCRYPT_SALT_ROUNDS ? Number(env.BCRYPT_SALT_ROUNDS) : DEFAULT_BCRYPT_SALT_ROUNDS
    },
    dailyCo: {
      enabled: dailyCoEnabled,
      apiKey: dailyCoApiKey,
      domain: dailyCoDomain
    },
    rateLimit: {
      global: {
        max: parseMax(env.RATE_LIMIT_MAX, DEFAULT_RATE_LIMIT_MAX),
        timeWindow: env.RATE_LIMIT_WINDOW ?? DEFAULT_RATE_LIMIT_WINDOW
      },
      critical: {
        max: parseMax(env.RATE_LIMIT_CRITICAL_MAX, parseMax(env.RATE_LIMIT_MAX, DEFAULT_RATE_LIMIT_MAX)),
        timeWindow: env.RATE_LIMIT_CRITICAL_WINDOW ?? env.RATE_LIMIT_WINDOW ?? DEFAULT_RATE_LIMIT_WINDOW
      }
    }
  };
}
