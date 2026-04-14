import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap, catchError, throwError } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const { method, url } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse<Response>();
        const ms = Date.now() - start;
        this.logger.log(`${method} ${url} ${res.statusCode} +${ms}ms`);
      }),
      catchError((err: unknown) => {
        const ms = Date.now() - start;
        const status = (err as { status?: number })?.status ?? 500;
        this.logger.log(`${method} ${url} ${status} +${ms}ms`);
        return throwError(() => err);
      }),
    );
  }
}
