import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateDishDto } from '../dto/create-dish.dto';
import { UpdateDishDto } from '../dto/update-dish.dto';
import { Dish, DishDocument } from '../schemas/dish.schema';

@Injectable()
export class DishesRepository {
  private readonly logger = new Logger(DishesRepository.name);

  constructor(
    @InjectModel(Dish.name)
    private readonly dishModel: Model<DishDocument>,
  ) {}

  async create(createDishDto: CreateDishDto): Promise<DishDocument> {
    const dish = new this.dishModel({
      ...createDishDto,
      menuId: new Types.ObjectId(createDishDto.menuId),
    });
    return dish.save();
  }

  async findByMenuId(menuId: string): Promise<Dish[]> {
    this.logger.log(`Buscando platos para menuId: ${menuId}`);
    return this.dishModel
      .find({ menuId: new Types.ObjectId(menuId) })
      .lean<Dish[]>();
  }

  async findById(id: string): Promise<Dish | null> {
    return this.dishModel.findById(id).lean<Dish>();
  }

  async update(id: string, updateDishDto: UpdateDishDto): Promise<Dish | null> {
    return this.dishModel
      .findByIdAndUpdate(id, { $set: updateDishDto }, { new: true })
      .lean<Dish>();
  }

  async updateStock(id: string, stock: number): Promise<Dish | null> {
    return this.dishModel
      .findByIdAndUpdate(id, { $set: { stock } }, { new: true })
      .lean<Dish>();
  }

  async remove(id: string): Promise<Dish | null> {
    return this.dishModel.findByIdAndDelete(id).lean<Dish>();
  }

  async removeByMenuId(menuId: string): Promise<void> {
    await this.dishModel.deleteMany({ menuId: new Types.ObjectId(menuId) });
  }

  async copyToMenu(fromMenuId: string, toMenuId: string): Promise<void> {
    const dishes = await this.findByMenuId(fromMenuId);
    const copies = dishes.map(({ ...rest }) => ({
      ...rest,
      menuId: new Types.ObjectId(toMenuId),
    }));
    await this.dishModel.insertMany(copies);
  }
}
