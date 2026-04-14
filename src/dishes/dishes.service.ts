import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateDishDto } from './dto/create-dish.dto';
import { UpdateDishDto } from './dto/update-dish.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { DishesRepository } from './repositories/dishes.repository';

@Injectable()
export class DishesService {
  private readonly logger = new Logger(DishesService.name);

  constructor(private readonly dishesRepository: DishesRepository) {}

  async create(createDishDto: CreateDishDto) {
    this.logger.log(
      `Creando plato: "${createDishDto.nombre}" en menuId: ${createDishDto.menuId}`,
    );
    const dish = await this.dishesRepository.create(createDishDto);
    this.logger.log(`Plato creado — id: ${(dish as any)._id}`);
    return dish;
  }

  async update(id: string, updateDishDto: UpdateDishDto) {
    this.logger.log(`Actualizando plato id: ${id}`);
    const dish = await this.dishesRepository.update(id, updateDishDto);

    if (!dish) {
      this.logger.warn(`Plato no encontrado para actualizar — id: ${id}`);
      throw new NotFoundException(`No existe plato con id ${id}`);
    }

    this.logger.log(`Plato actualizado — id: ${id}`);
    return dish;
  }

  async updateStock(id: string, updateStockDto: UpdateStockDto) {
    this.logger.log(
      `Actualizando stock plato id: ${id} — nuevo stock: ${updateStockDto.stock}`,
    );
    const dish = await this.dishesRepository.updateStock(
      id,
      updateStockDto.stock,
    );

    if (!dish) {
      this.logger.warn(`Plato no encontrado para actualizar stock — id: ${id}`);
      throw new NotFoundException(`No existe plato con id ${id}`);
    }

    this.logger.log(
      `Stock actualizado — id: ${id}, stock: ${updateStockDto.stock}`,
    );
    return dish;
  }

  async remove(id: string) {
    this.logger.log(`Eliminando plato id: ${id}`);
    const dish = await this.dishesRepository.remove(id);

    if (!dish) {
      this.logger.warn(`Plato no encontrado para eliminar — id: ${id}`);
      throw new NotFoundException(`No existe plato con id ${id}`);
    }

    this.logger.log(`Plato eliminado — id: ${id}`);
    return dish;
  }
}
