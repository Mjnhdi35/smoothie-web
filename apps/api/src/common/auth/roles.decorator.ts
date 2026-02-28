import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY, type AppRole } from './roles.constants';

export function Roles(...roles: AppRole[]): MethodDecorator & ClassDecorator {
  return SetMetadata(ROLES_KEY, roles);
}
