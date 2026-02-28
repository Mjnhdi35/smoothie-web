import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisCacheService } from '../../infrastructure/redis/redis-cache.service';
import { AUTH_REPOSITORY } from './auth.constants';
import type { AuthRepositoryPort } from './auth.repository.port';

interface SessionCachePayload {
  userId: string;
  expiresAt: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository: AuthRepositoryPort,
    private readonly cacheService: RedisCacheService,
    private readonly configService: ConfigService,
  ) {}

  async login(
    userId: string,
  ): Promise<{ sessionId: string; expiresAt: string }> {
    const sessionId = crypto.randomUUID();
    const ttlSeconds =
      this.configService.get<number>('AUTH_SESSION_TTL_SECONDS') ?? 86_400;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await this.authRepository.createSession({ sessionId, userId, expiresAt });
    await this.cacheService.setJson<SessionCachePayload>(
      `auth:session:${sessionId}`,
      {
        userId,
        expiresAt: expiresAt.toISOString(),
      },
      ttlSeconds,
    );

    return { sessionId, expiresAt: expiresAt.toISOString() };
  }

  async logout(sessionId: string): Promise<void> {
    const updated = await this.authRepository.revokeSession(sessionId);

    if (updated === 0) {
      throw new NotFoundException('Session not found');
    }

    await this.cacheService.del(`auth:session:${sessionId}`);
  }
}
