import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { UserRole } from '../auth.service';

interface JwtUser {
  sub: string;
  role: UserRole;
}

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si no hay @Roles en el handler, se permite el acceso
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as JwtUser | undefined;

    if (!user?.role || !requiredRoles.includes(user.role)) {
      this.logger.warn(
        `Acceso denegado — rol "${user?.role ?? 'sin rol'}" no está en [${requiredRoles.join(', ')}] — ${req.method} ${req.url}`,
      );
      throw new ForbiddenException(
        `Se requiere uno de los roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
