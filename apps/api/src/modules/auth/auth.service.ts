import { Injectable } from '@nestjs/common';
import { AuthRepository } from './auth.repository';

@Injectable()
export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  async login(userId: string): Promise<{ sessionId: string }> {
    const sessionId = crypto.randomUUID();
    await this.authRepository.createSession({ sessionId, userId });
    return { sessionId };
  }
}
