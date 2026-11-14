import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpException,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { GoogleAuthService } from './google-auth.service';
import {
  CustomerSessionService,
  CUSTOMER_SESSION_MS,
} from './customer-session.service';
import { GoogleLoginDto } from './dto/google-login.dto';
const COOKIE = 'sa_customer_session';
const COOKIE_PATH = '/api/auth';
@Controller('auth')
export class CustomerAuthController {
  constructor(
    private readonly google: GoogleAuthService,
    private readonly sessions: CustomerSessionService,
    private readonly config: ConfigService,
  ) {}
  private options() {
    return {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax' as const,
      path: COOKIE_PATH,
    };
  }
  private check(req: Request, res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    const origins =
      this.config
        .get<string>('CUSTOMER_WEB_ORIGINS')
        ?.split(',')
        .map((o) => o.trim())
        .filter(Boolean) ??
      (this.config.get('NODE_ENV') === 'production'
        ? []
        : [
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:5175',
            'http://127.0.0.1:5175',
          ]);
    if (
      req.get('X-Customer-Request') !== '1' ||
      !origins.includes(req.get('Origin') || '')
    )
      throw new ForbiddenException('Origen de sesión no permitido.');
  }
  private token(req: Request) {
    return req.headers.cookie
      ?.split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${COOKIE}=`))
      ?.slice(COOKIE.length + 1)
      .match(/^[a-f0-9]{64}$/)?.[0];
  }
  @Post('google')
  @HttpCode(200)
  async login(
    @Body() dto: GoogleLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.check(req, res);
    const identity = await this.google.verify(dto.credential);
    // Replacing an account also closes the remembered session on this browser.
    await this.sessions.revoke(this.token(req));
    const { refreshToken, ...body } = await this.sessions.create(identity);
    res.cookie(COOKIE, refreshToken, {
      ...this.options(),
      maxAge: CUSTOMER_SESSION_MS,
    });
    return body;
  }
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.check(req, res);
    const token = this.token(req);
    if (!token) {
      res.status(204);
      return;
    }
    try {
      return await this.sessions.refresh(token);
    } catch (error) {
      if (
        error instanceof HttpException &&
        [401, 403].includes(error.getStatus())
      )
        res.clearCookie(COOKIE, this.options());
      throw error;
    }
  }
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.check(req, res);
    await this.sessions.revoke(this.token(req));
    res.clearCookie(COOKIE, this.options());
  }
}
