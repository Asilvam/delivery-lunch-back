import { MongooseModule } from '@nestjs/mongoose';
import { CustomersModule } from '../customers/customers.module';
import { CustomerAuthController } from './customer-auth.controller';
import { CustomerSessionService } from './customer-session.service';
import {
  CustomerSessionRecord,
  CustomerSessionSchema,
} from './customer-session.schema';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { StringValue } from 'ms';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleAuthService } from './google-auth.service';
import { RolesGuard } from './guards/roles.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    CustomersModule,
    MongooseModule.forFeature([
      { name: CustomerSessionRecord.name, schema: CustomerSessionSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>(
            'JWT_EXPIRES_IN',
            '7d',
          ) as StringValue,
        },
      }),
    }),
  ],
  controllers: [AuthController, CustomerAuthController],
  providers: [
    AuthService,
    CustomerSessionService,
    GoogleAuthService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [JwtAuthGuard, JwtModule, RolesGuard],
})
export class AuthModule {}
