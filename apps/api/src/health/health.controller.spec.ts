import { HttpStatus } from '@nestjs/common';
import { HealthController } from './health.controller';
import type { HealthService, HealthStatus } from './health.service';

describe('HealthController', () => {
  it('should return health payload when status is ok', async () => {
    const healthPayload: HealthStatus = {
      status: 'ok',
      timestamp: '2026-01-01T00:00:00.000Z',
      services: {
        postgres: { status: 'up', latencyMs: 5 },
        redis: { status: 'disabled', message: 'REDIS_URL is not configured' },
      },
    };

    const healthServiceMock = {
      check: jest.fn().mockResolvedValue(healthPayload),
    } as unknown as HealthService;

    const healthController = new HealthController(healthServiceMock);

    await expect(healthController.getHealth()).resolves.toEqual(healthPayload);
  });

  it('should throw 503 when status is degraded', async () => {
    const healthPayload: HealthStatus = {
      status: 'degraded',
      timestamp: '2026-01-01T00:00:00.000Z',
      services: {
        postgres: { status: 'down', message: 'postgres down' },
        redis: { status: 'up', latencyMs: 3 },
      },
    };

    const healthServiceMock = {
      check: jest.fn().mockResolvedValue(healthPayload),
    } as unknown as HealthService;

    const healthController = new HealthController(healthServiceMock);

    await expect(healthController.getHealth()).rejects.toHaveProperty(
      'status',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  });
});
