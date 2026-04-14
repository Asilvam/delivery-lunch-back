import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DishesModule } from '../dishes/dishes.module';
import { MenuModule } from '../menu/menu.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './repositories/orders.repository';
import { Order, OrderSchema } from './schemas/order.schema';
import { OrdersSseService } from './services/orders-sse.service';
import { WhatsappService } from './services/whatsapp.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    DishesModule, // exporta DishesRepository
    MenuModule, // exporta MenuService (y necesitamos MenuRepository)
    AuthModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrdersRepository,
    WhatsappService,
    OrdersSseService,
    RolesGuard,
  ],
})
export class OrdersModule {}
