import { HealthService } from './health.service';
import type { KnexService } from '../database/knex.service';
import type { RedisClient } from '../redis/redis.module';

describe('HealthService', () => {
  it('should return ok when postgres is up and redis is disabled', async () => {
    const knexServiceMock = {
      raw: jest.fn().mockResolvedValue({}),
    } as unknown as KnexService;

    const healthService = new HealthService(knexServiceMock, null);

    const result = await healthService.check();

    expect(result.status).toBe('ok');
    expect(result.services.postgres.status).toBe('up');
    expect(result.services.redis.status).toBe('disabled');
  });

  it('should return degraded when postgres is down', async () => {
    const knexServiceMock = {
      raw: jest.fn().mockRejectedValue(new Error('postgres down')),
    } as unknown as KnexService;

    const healthService = new HealthService(knexServiceMock, null);

    const result = await healthService.check();

    expect(result.status).toBe('degraded');
    expect(result.services.postgres.status).toBe('down');
  });

  it('should return degraded when redis ping fails', async () => {
    const knexServiceMock = {
      raw: jest.fn().mockResolvedValue({}),
    } as unknown as KnexService;

    const redisMock = {
      ping: jest.fn().mockRejectedValue(new Error('redis down')),
    } as unknown as RedisClient;

    const healthService = new HealthService(knexServiceMock, redisMock);

    const result = await healthService.check();

    expect(result.status).toBe('degraded');
    expect(result.services.redis.status).toBe('down');
  });
});
