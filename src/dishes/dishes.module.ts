import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { DishesController } from './dishes.controller';
import { DishesService } from './dishes.service';
import { DishesRepository } from './repositories/dishes.repository';
import { Dish, DishSchema } from './schemas/dish.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Dish.name, schema: DishSchema }]),
    AuthModule,
  ],
  controllers: [DishesController],
  providers: [DishesService, DishesRepository],
  exports: [DishesRepository],
})
export class DishesModule {}
