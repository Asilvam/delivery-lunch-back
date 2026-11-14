import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CustomersModule } from './customers.module';
import { CustomersController } from './customers.controller';
@Module({
  imports: [AuthModule, CustomersModule],
  controllers: [CustomersController],
})
export class CustomerAdminModule {}
