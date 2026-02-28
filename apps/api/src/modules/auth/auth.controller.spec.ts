import { AuthController } from './auth.controller';
import type { AuthService } from './auth.service';

type AuthServiceMock = {
  login: jest.Mock;
  logout: jest.Mock;
};

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthServiceMock;

  beforeEach(() => {
    authService = {
      login: jest.fn(),
      logout: jest.fn(),
    };

    authController = new AuthController(authService as unknown as AuthService);
  });

  it('should delegate login', async () => {
    authService.login.mockResolvedValue({
      sessionId: 'f0f1f2f3-aaaa-4bbb-8ccc-0123456789ab',
      expiresAt: '2026-03-01T00:00:00.000Z',
    });

    await authController.login({
      userId: 'f0f1f2f3-aaaa-4bbb-8ccc-0123456789ab',
    });

    expect(authService.login).toHaveBeenCalledWith(
      'f0f1f2f3-aaaa-4bbb-8ccc-0123456789ab',
    );
  });

  it('should delegate logout', async () => {
    authService.logout.mockResolvedValue(undefined);

    await authController.logout({
      sessionId: 'f0f1f2f3-aaaa-4bbb-8ccc-0123456789ab',
    });

    expect(authService.logout).toHaveBeenCalledWith(
      'f0f1f2f3-aaaa-4bbb-8ccc-0123456789ab',
    );
  });
});
