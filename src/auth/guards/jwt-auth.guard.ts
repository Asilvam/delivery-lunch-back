import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  handleRequest<TUser>(
    err: Error | null,
    user: TUser,
    info: { message?: string } | undefined,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      const req = context.switchToHttp().getRequest<Request>();
      const reason =
        info?.message ?? err?.message ?? 'token invalido o ausente';
      this.logger.warn(
        `Acceso denegado — ${req.method} ${req.url} — ${reason}`,
      );
      throw err ?? new UnauthorizedException(reason);
    }
    return user;
  }
}
