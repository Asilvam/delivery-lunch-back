import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { LibraryDish, LibraryDishSchema } from './dish-library.schema';
import { DishLibraryController } from './dish-library.controller';
import { DishLibraryService } from './dish-library.service';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: LibraryDish.name, schema: LibraryDishSchema },
    ]),
  ],
  controllers: [DishLibraryController],
  providers: [DishLibraryService],
  exports: [DishLibraryService, MongooseModule],
})
export class DishLibraryModule {}
