import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AUTH_REPOSITORY } from './auth.constants';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthRepository,
    {
      provide: AUTH_REPOSITORY,
      useExisting: AuthRepository,
    },
    AuthService,
  ],
})
export class AuthModule {}
