import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { DishLibraryModule } from '../dish-library/dish-library.module';
import { MenuCompositionService } from './menu-composition.service';
import { MenuPublicationService } from './menu-publication.service';
import { MenuPricingService } from './menu-pricing.service';
import { Dish, DishSchema } from '../dishes/schemas/dish.schema';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { DishesModule } from '../dishes/dishes.module';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { MenuRepository } from './repositories/menu.repository';
import { Menu, MenuSchema } from './schemas/menu.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Menu.name, schema: MenuSchema },
      { name: Dish.name, schema: DishSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    DishesModule,
    DishLibraryModule,
    AuthModule,
  ],
  controllers: [MenuController],
  providers: [
    MenuService,
    MenuRepository,
    MenuPricingService,
    MenuCompositionService,
    MenuPublicationService,
  ],
  exports: [MenuService, MenuRepository],
})
export class MenuModule {}
