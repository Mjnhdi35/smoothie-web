import { normalizeDatabaseUrl } from './database-url';

export type RuntimeEnv = {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  DATABASE_URL: string;
  REDIS_URL?: string;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX: number;
  CHAT_WS_PORT: number;
  CHAT_SOCKET_RATE_LIMIT_WINDOW_MS: number;
  CHAT_SOCKET_RATE_LIMIT_MAX: number;
  CHAT_SOCKET_MAX_BUFFER_BYTES: number;
  CHAT_MAX_CONNECTIONS: number;
  CHAT_MAX_INFLIGHT_MESSAGES_PER_SOCKET: number;
  AUTH_SESSION_TTL_SECONDS: number;
};

const NODE_ENVS: RuntimeEnv['NODE_ENV'][] = [
  'development',
  'test',
  'production',
];

function getRequiredString(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];

  if (value === undefined || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function getDatabaseUrl(env: NodeJS.ProcessEnv): string {
  return normalizeDatabaseUrl(getRequiredString(env, 'DATABASE_URL'));
}

function getPort(env: NodeJS.ProcessEnv): number {
  const rawPort = env.PORT ?? '3000';
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT value: ${rawPort}`);
  }

  return port;
}

function getPositiveInt(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: number,
): number {
  const raw = env[key];
  const value = raw === undefined ? fallback : Number(raw);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid ${key} value: ${raw ?? String(fallback)}`);
  }

  return value;
}

function getNodeEnv(env: NodeJS.ProcessEnv): RuntimeEnv['NODE_ENV'] {
  const nodeEnv = (
    env.NODE_ENV ?? 'development'
  ).trim() as RuntimeEnv['NODE_ENV'];

  if (!NODE_ENVS.includes(nodeEnv)) {
    throw new Error(`Invalid NODE_ENV value: ${nodeEnv}`);
  }

  return nodeEnv;
}

export function validateEnv(env: NodeJS.ProcessEnv): RuntimeEnv {
  const redisUrl = env.REDIS_URL;
  const normalizedRedisUrl =
    redisUrl === undefined || redisUrl.trim() === ''
      ? undefined
      : redisUrl.trim();

  return {
    NODE_ENV: getNodeEnv(env),
    PORT: getPort(env),
    DATABASE_URL: getDatabaseUrl(env),
    REDIS_URL: normalizedRedisUrl,
    RATE_LIMIT_WINDOW_MS: getPositiveInt(env, 'RATE_LIMIT_WINDOW_MS', 60000),
    RATE_LIMIT_MAX: getPositiveInt(env, 'RATE_LIMIT_MAX', 100),
    CHAT_WS_PORT: getPositiveInt(env, 'CHAT_WS_PORT', 3101),
    CHAT_SOCKET_RATE_LIMIT_WINDOW_MS: getPositiveInt(
      env,
      'CHAT_SOCKET_RATE_LIMIT_WINDOW_MS',
      60000,
    ),
    CHAT_SOCKET_RATE_LIMIT_MAX: getPositiveInt(
      env,
      'CHAT_SOCKET_RATE_LIMIT_MAX',
      20,
    ),
    CHAT_SOCKET_MAX_BUFFER_BYTES: getPositiveInt(
      env,
      'CHAT_SOCKET_MAX_BUFFER_BYTES',
      1_048_576,
    ),
    CHAT_MAX_CONNECTIONS: getPositiveInt(env, 'CHAT_MAX_CONNECTIONS', 2000),
    CHAT_MAX_INFLIGHT_MESSAGES_PER_SOCKET: getPositiveInt(
      env,
      'CHAT_MAX_INFLIGHT_MESSAGES_PER_SOCKET',
      8,
    ),
    AUTH_SESSION_TTL_SECONDS: getPositiveInt(
      env,
      'AUTH_SESSION_TTL_SECONDS',
      86_400,
    ),
  };
}
