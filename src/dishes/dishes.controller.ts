import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateDishDto } from './dto/create-dish.dto';
import { UpdateDishDto } from './dto/update-dish.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { DishesService } from './dishes.service';

@Controller('dishes')
export class DishesController {
  constructor(private readonly dishesService: DishesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() createDishDto: CreateDishDto) {
    return this.dishesService.create(createDishDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDishDto: UpdateDishDto) {
    return this.dishesService.update(id, updateDishDto);
  }

  @Patch(':id/stock')
  async updateStock(
    @Param('id') id: string,
    @Body() updateStockDto: UpdateStockDto,
  ) {
    return this.dishesService.updateStock(id, updateStockDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.dishesService.remove(id);
  }
}
