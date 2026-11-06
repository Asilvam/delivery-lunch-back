import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class GoogleAuthService {
  private readonly client = new OAuth2Client();
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  async login(credential: string) {
    const audience = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!audience)
      throw new ServiceUnavailableException(
        'El acceso con Google no está configurado',
      );
    let payload;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: credential,
        audience,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException(
        'No pudimos verificar tu cuenta de Google. Vuelve a iniciar sesión.',
      );
    }
    if (!payload?.sub || !payload.email || !payload.email_verified) {
      throw new UnauthorizedException(
        'Se requiere una cuenta de Google con correo verificado',
      );
    }
    const customer = {
      googleId: payload.sub,
      name: payload.name || payload.email,
      email: payload.email,
    };
    return {
      access_token: this.jwt.sign(
        {
          sub: customer.googleId,
          role: 'customer',
          name: customer.name,
          email: customer.email,
        },
        { expiresIn: '1h' },
      ),
      customer,
    };
  }
}
