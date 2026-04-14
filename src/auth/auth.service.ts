import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

export type UserRole = 'admin' | 'kitchen';

interface UserConfig {
  username: string;
  passwordHash: string;
  role: UserRole;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = this.resolveUser(loginDto.username);

    if (!user) {
      this.logger.warn(
        `Login fallido — usuario desconocido: "${loginDto.username}"`,
      );
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const passwordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordValid) {
      this.logger.warn(
        `Login fallido — password incorrecto para usuario: "${loginDto.username}"`,
      );
      throw new UnauthorizedException('Credenciales invalidas');
    }

    this.logger.log(
      `Login exitoso — usuario: "${loginDto.username}", rol: "${user.role}"`,
    );

    const payload = { sub: user.username, role: user.role };
    return { access_token: this.jwtService.sign(payload) };
  }

  /** Busca el usuario en la configuración por nombre de usuario. */
  private resolveUser(username: string): UserConfig | null {
    const adminUsername =
      this.configService.getOrThrow<string>('ADMIN_USERNAME');
    const adminHash = this.configService.getOrThrow<string>(
      'ADMIN_PASSWORD_HASH',
    );

    if (username === adminUsername) {
      return {
        username: adminUsername,
        passwordHash: adminHash,
        role: 'admin',
      };
    }

    const kitchenUsername = this.configService.get<string>('KITCHEN_USERNAME');
    const kitchenHash = this.configService.get<string>('KITCHEN_PASSWORD_HASH');

    if (kitchenUsername && kitchenHash && username === kitchenUsername) {
      return {
        username: kitchenUsername,
        passwordHash: kitchenHash,
        role: 'kitchen',
      };
    }

    return null;
  }
}
