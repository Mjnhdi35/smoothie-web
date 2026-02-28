import { NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { RedisCacheService } from '../../infrastructure/redis/redis-cache.service';
import type { AuthRepositoryPort } from './auth.repository.port';
import { AuthService } from './auth.service';

type AuthRepositoryMock = {
  createSession: jest.Mock;
  revokeSession: jest.Mock;
};

type RedisCacheMock = {
  setJson: jest.Mock;
  del: jest.Mock;
};

type ConfigServiceMock = {
  get: jest.Mock;
};

describe('AuthService', () => {
  let authService: AuthService;
  let authRepository: AuthRepositoryMock;
  let cacheService: RedisCacheMock;
  let configService: ConfigServiceMock;

  beforeEach(() => {
    authRepository = {
      createSession: jest.fn(),
      revokeSession: jest.fn(),
    };

    cacheService = {
      setJson: jest.fn(),
      del: jest.fn(),
    };

    configService = {
      get: jest.fn().mockReturnValue(3600),
    };

    authService = new AuthService(
      authRepository as unknown as AuthRepositoryPort,
      cacheService as unknown as RedisCacheService,
      configService as unknown as ConfigService,
    );
  });

  it('login should create db session and cache with ttl', async () => {
    const result = await authService.login(
      'f0f1f2f3-aaaa-4bbb-8ccc-0123456789ab',
    );

    expect(result.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    const firstCallArg = authRepository.createSession.mock.calls[0]?.[0] as
      | {
          sessionId: string;
          userId: string;
          expiresAt: Date;
        }
      | undefined;
    expect(firstCallArg).toBeDefined();
    expect(firstCallArg?.sessionId).toBe(result.sessionId);
    expect(firstCallArg?.userId).toBe('f0f1f2f3-aaaa-4bbb-8ccc-0123456789ab');
    expect(firstCallArg?.expiresAt).toBeInstanceOf(Date);
    expect(cacheService.setJson).toHaveBeenCalledWith(
      `auth:session:${result.sessionId}`,
      expect.objectContaining({
        userId: 'f0f1f2f3-aaaa-4bbb-8ccc-0123456789ab',
      }),
      3600,
    );
  });

  it('logout should throw when session not found', async () => {
    authRepository.revokeSession.mockResolvedValue(0);

    await expect(
      authService.logout('f0f1f2f3-aaaa-4bbb-8ccc-0123456789ab'),
    ).rejects.toThrow(NotFoundException);
  });

  it('logout should revoke session and clear cache', async () => {
    authRepository.revokeSession.mockResolvedValue(1);

    await authService.logout('f0f1f2f3-aaaa-4bbb-8ccc-0123456789ab');

    expect(cacheService.del).toHaveBeenCalledWith(
      'auth:session:f0f1f2f3-aaaa-4bbb-8ccc-0123456789ab',
    );
  });
});
