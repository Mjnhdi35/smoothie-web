import type { Knex } from 'knex';
import { HealthService } from './health.service';
import type { RedisClient } from '../redis/redis.module';

describe('HealthService', () => {
  it('should return ok when postgres is up and redis is disabled', async () => {
    const knexMock = {
      raw: jest.fn().mockResolvedValue({}),
    } as unknown as Knex;

    const healthService = new HealthService(knexMock, null);

    const result = await healthService.check();

    expect(result.status).toBe('ok');
    expect(result.services.postgres.status).toBe('up');
    expect(result.services.redis.status).toBe('disabled');
  });

  it('should return degraded when postgres is down', async () => {
    const knexMock = {
      raw: jest.fn().mockRejectedValue(new Error('postgres down')),
    } as unknown as Knex;

    const healthService = new HealthService(knexMock, null);

    const result = await healthService.check();

    expect(result.status).toBe('degraded');
    expect(result.services.postgres.status).toBe('down');
  });

  it('should return degraded when redis ping fails', async () => {
    const knexMock = {
      raw: jest.fn().mockResolvedValue({}),
    } as unknown as Knex;

    const redisMock = {
      ping: jest.fn().mockRejectedValue(new Error('redis down')),
    } as unknown as RedisClient;

    const healthService = new HealthService(knexMock, redisMock);

    const result = await healthService.check();

    expect(result.status).toBe('degraded');
    expect(result.services.redis.status).toBe('down');
  });
});
