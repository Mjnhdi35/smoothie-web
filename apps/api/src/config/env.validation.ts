export type RuntimeEnv = {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  DATABASE_URL: string;
  REDIS_URL?: string;
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

function getPort(env: NodeJS.ProcessEnv): number {
  const rawPort = env.PORT ?? '3000';
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT value: ${rawPort}`);
  }

  return port;
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
    DATABASE_URL: getRequiredString(env, 'DATABASE_URL'),
    REDIS_URL: normalizedRedisUrl,
  };
}
