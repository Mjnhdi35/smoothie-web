import { knex as createKnex } from 'knex';
import knexConfig from '../../knexfile';

type KnexEnv = 'development' | 'test' | 'production';

function getEnvArg(): KnexEnv {
  const envArg = process.argv.find((arg) => arg.startsWith('--env='));
  const envValue = envArg?.split('=')[1] ?? 'development';

  if (
    envValue !== 'development' &&
    envValue !== 'test' &&
    envValue !== 'production'
  ) {
    throw new Error(
      `Invalid --env value "${envValue}". Use development, test, or production.`,
    );
  }

  return envValue;
}

async function run(): Promise<void> {
  const env = getEnvArg();

  if (env === 'production' || process.env.NODE_ENV === 'production') {
    throw new Error('Seeding production is blocked by policy.');
  }

  const config = knexConfig[env];
  const knexClient = createKnex(config);

  try {
    await knexClient.seed.run();

    console.log(`Seed completed for environment: ${env}`);
  } finally {
    await knexClient.destroy();
  }
}

void run();
