import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  type OnModuleInit,
} from '@nestjs/common';
import { Reflector, ModulesContainer } from '@nestjs/core';
import type { AppRole } from '../../../common/auth/roles.constants';
import { APP_ROLES, ROLES_KEY } from '../../../common/auth/roles.constants';

interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: {
    role?: string;
  };
}

type RouteHandler = (...args: unknown[]) => unknown;
type ControllerClass = new (...args: never[]) => unknown;

@Injectable()
export class RolesGuard implements CanActivate, OnModuleInit {
  private readonly roleCache = new Map<RouteHandler, readonly AppRole[]>();

  constructor(
    private readonly reflector: Reflector,
    private readonly modulesContainer: ModulesContainer,
  ) {}

  onModuleInit(): void {
    for (const moduleRef of this.modulesContainer.values()) {
      for (const wrapper of moduleRef.controllers.values()) {
        const instance = wrapper.instance as object | undefined;
        if (instance === undefined) {
          continue;
        }

        const controllerType = instance.constructor as ControllerClass;
        const prototype = controllerType.prototype as Record<string, unknown>;

        for (const propertyName of Object.getOwnPropertyNames(prototype)) {
          if (propertyName === 'constructor') {
            continue;
          }

          const handler = prototype[propertyName];
          if (typeof handler !== 'function') {
            continue;
          }

          this.roleCache.set(
            handler as RouteHandler,
            this.resolveRoles(handler as RouteHandler, controllerType),
          );
        }
      }
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const handler = context.getHandler() as RouteHandler;
    const controller = context.getClass() as ControllerClass;

    const requiredRoles =
      this.roleCache.get(handler) ?? this.resolveRoles(handler, controller);

    if (requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const requestRole = this.extractRole(request);

    if (requestRole === undefined || !requiredRoles.includes(requestRole)) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }

  private resolveRoles(
    handler: RouteHandler,
    controller: ControllerClass,
  ): readonly AppRole[] {
    const roles = this.reflector.getAllAndOverride<readonly AppRole[]>(
      ROLES_KEY,
      [handler, controller],
    );

    if (roles === undefined) {
      return [];
    }

    return roles.filter((role) => APP_ROLES.includes(role));
  }

  private extractRole(request: AuthenticatedRequest): AppRole | undefined {
    const fromUser = request.user?.role;
    if (
      typeof fromUser === 'string' &&
      APP_ROLES.includes(fromUser as AppRole)
    ) {
      return fromUser as AppRole;
    }

    const header = request.headers['x-role'];
    const value = Array.isArray(header) ? header[0] : header;

    if (value === undefined) {
      return undefined;
    }

    const normalized = value.trim().toLowerCase();
    return APP_ROLES.includes(normalized as AppRole)
      ? (normalized as AppRole)
      : undefined;
  }
}
