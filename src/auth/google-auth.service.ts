import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';

@Injectable()
export class GoogleAuthService {
  private readonly client = new OAuth2Client();
  constructor(private readonly config: ConfigService) {}

  async verify(credential: string) {
    const audience = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!audience)
      throw new ServiceUnavailableException(
        'El acceso con Google no está configurado',
      );
    let payload: TokenPayload | undefined;
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
    return {
      googleId: payload.sub,
      name: payload.name || payload.email,
      email: payload.email,
    };
  }
}
