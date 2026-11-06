import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { GoogleAuthService } from './google-auth.service';

import { ApiTags } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleAuth: GoogleAuthService,
  ) {}

  @Post('google')
  async google(@Body() dto: GoogleLoginDto) {
    return this.googleAuth.login(dto.credential);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login, obtiene JWT' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Retorna access_token JWT',
    type: require('./dto/login-response.dto').LoginResponseDto,
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
