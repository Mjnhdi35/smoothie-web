export interface AuthRepositoryPort {
  createSession(input: {
    sessionId: string;
    userId: string;
    expiresAt: Date;
  }): Promise<void>;
  revokeSession(sessionId: string): Promise<number>;
}
