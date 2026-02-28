import {
  Global,
  Inject,
  Injectable,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { knex } from 'knex';
import { KNEX } from './database.constants';
import type { DbKnex } from './database.constants';
import { KnexService } from './knex.service';

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
    KnexService,
    KnexLifecycle,
  ],
  exports: [KNEX, KnexService],
})
export class DatabaseModule {}
