import {
  Global,
  Inject,
  Injectable,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { knex } from 'knex';
import type { Knex } from 'knex';

export const KNEX = Symbol('KNEX');
export type DbKnex = Knex<Record<string, unknown>, unknown[]>;

@Injectable()
class KnexLifecycle implements OnApplicationShutdown {
  private destroyed = false;

  constructor(@Inject(KNEX) private readonly knexClient: DbKnex) {}

  async onApplicationShutdown(): Promise<void> {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    await this.knexClient.destroy();
  }
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: KNEX,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): DbKnex => {
        const connection = configService.getOrThrow<string>('DATABASE_URL');

        return knex({
          client: 'pg',
          connection,
          pool: { min: 0, max: 3 },
        });
      },
    },
    KnexLifecycle,
  ],
  exports: [KNEX],
})
export class DatabaseModule {}
