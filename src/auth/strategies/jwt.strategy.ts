import { CustomersService } from '../../customers/customers.service';
import { CustomerSessionService } from '../customer-session.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly customers: CustomersService,
    private readonly sessions: CustomerSessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: {
    sub: string;
    role: string;
    name?: string;
    email?: string;
    sid?: string;
    version?: number;
  }) {
    if (payload.role === 'customer') {
      if (!payload.sid)
        throw new UnauthorizedException('Vuelve a iniciar sesión con Google.');
      await this.customers.active(payload.sub, payload.version ?? 0);
      await this.sessions.validateAccess(
        payload.sub,
        payload.sid,
        payload.version ?? 0,
      );
    }
    return {
      username: payload.sub,
      role: payload.role,
      name: payload.name,
      email: payload.email,
      authVersion: payload.version ?? 0,
    };
  }
}
