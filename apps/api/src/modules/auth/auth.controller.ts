import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(
    @Body() body: LoginDto,
  ): Promise<{ sessionId: string; expiresAt: string }> {
    return this.authService.login(body.userId);
  }

  @Post('logout')
  async logout(@Body() body: LogoutDto): Promise<void> {
    await this.authService.logout(body.sessionId);
  }
}
