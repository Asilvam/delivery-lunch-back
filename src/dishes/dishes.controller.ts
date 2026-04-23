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
import { ApiOkResponse, ApiBody } from '@nestjs/swagger';
import { DishDto } from './dto/dish.dto';

import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('dishes')
@ApiBearerAuth()
@Controller('dishes')
export class DishesController {
  constructor(private readonly dishesService: DishesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOkResponse({ description: 'Plato creado', type: DishDto })
  @ApiBody({ type: CreateDishDto })
  async create(@Body() createDishDto: CreateDishDto) {
    return this.dishesService.create(createDishDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiOkResponse({ description: 'Plato actualizado', type: DishDto })
  @ApiBody({ type: UpdateDishDto })
  async update(@Param('id') id: string, @Body() updateDishDto: UpdateDishDto) {
    return this.dishesService.update(id, updateDishDto);
  }

  @Patch(':id/stock')
  @ApiOkResponse({ description: 'Stock actualizado', type: DishDto })
  @ApiBody({ type: UpdateStockDto })
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
