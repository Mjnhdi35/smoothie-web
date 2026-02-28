import {
  Global,
  Inject,
  Injectable,
  Module,
  OnApplicationShutdown,
  Logger,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { knex } from 'knex';
import { normalizeDatabaseUrl } from '../config/database-url';
import { KNEX } from './database.constants';
import type { DbKnex } from './database.constants';
import { KnexService } from './knex.service';

@Injectable()
class KnexLifecycle implements OnApplicationShutdown {
  private destroyed = false;
  private readonly logger = new Logger(KnexLifecycle.name);

  constructor(@Inject(KNEX) private readonly knexClient: DbKnex) {}

  async onApplicationShutdown(): Promise<void> {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    await this.knexClient.destroy();
    this.logger.log('PostgreSQL connection pool closed');
  }
}

async function pingWithRetry(
  knexClient: DbKnex,
  retries: number,
  delayMs: number,
): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await knexClient.raw('select 1');
      return;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: KNEX,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService): Promise<DbKnex> => {
        const connection = normalizeDatabaseUrl(
          configService.getOrThrow<string>('DATABASE_URL'),
        );

        const knexClient = knex({
          client: 'pg',
          connection: {
            connectionString: connection,
            ssl: {
              rejectUnauthorized: true,
            },
            statement_timeout: 5000,
            query_timeout: 5000,
          },
          pool: {
            min: 0,
            max: 5,
            idleTimeoutMillis: 30000,
          },
        });

        await pingWithRetry(knexClient, 4, 250);

        return knexClient;
      },
    },
    KnexService,
    KnexLifecycle,
  ],
  exports: [KNEX, KnexService],
})
export class DatabaseModule {}
