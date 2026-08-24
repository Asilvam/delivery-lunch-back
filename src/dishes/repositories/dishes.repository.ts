import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateDishDto } from '../dto/create-dish.dto';
import { UpdateDishDto } from '../dto/update-dish.dto';
import { Dish, DishDocument } from '../schemas/dish.schema';
import { MenuDishInputDto } from '../../menu/dto/menu-dish-input.dto';

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
      .sort({ orden: 1, createdAt: 1 })
      .lean<Dish[]>();
  }

  async createMany(
    menuId: string,
    dishes: MenuDishInputDto[],
  ): Promise<Dish[]> {
    if (dishes.length === 0) return [];

    const documents = dishes.map((input, orden) => {
      const dish = { ...input };
      delete dish.id;
      return {
        ...dish,
        menuId: new Types.ObjectId(menuId),
        orden,
      };
    });

    const inserted = await this.dishModel.insertMany(documents);
    return inserted.map((document) => document.toObject()) as Dish[];
  }

  async replaceForMenu(
    menuId: string,
    dishes: MenuDishInputDto[],
  ): Promise<void> {
    const menuObjectId = new Types.ObjectId(menuId);
    const existing = await this.dishModel
      .find({ menuId: menuObjectId })
      .select({ _id: 1 })
      .lean<Array<{ _id: Types.ObjectId }>>();
    const existingIds = new Set(existing.map((dish) => dish._id.toString()));

    for (const dish of dishes) {
      if (dish.id && !existingIds.has(dish.id)) {
        throw new BadRequestException(
          `El plato ${dish.id} no pertenece al menu ${menuId}`,
        );
      }
    }

    const retainedIds = dishes
      .map((dish) => dish.id)
      .filter((id): id is string => Boolean(id));

    const removedIds = existing
      .map((dish) => dish._id.toString())
      .filter((id) => !retainedIds.includes(id));

    const operations = dishes.map((dish, orden) => {
      const { id, ...values } = dish;
      if (id) {
        return {
          updateOne: {
            filter: { _id: new Types.ObjectId(id), menuId: menuObjectId },
            update: { $set: { ...values, orden } },
          },
        };
      }

      return {
        insertOne: {
          document: { ...values, menuId: menuObjectId, orden },
        },
      };
    });

    const deletionOperations =
      removedIds.length > 0
        ? [
            {
              deleteMany: {
                filter: {
                  menuId: menuObjectId,
                  _id: {
                    $in: removedIds.map((id) => new Types.ObjectId(id)),
                  },
                },
              },
            },
          ]
        : [];

    if (operations.length > 0 || deletionOperations.length > 0) {
      await this.dishModel.bulkWrite([...operations, ...deletionOperations]);
    }
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
    const copies = dishes.map((dish) => {
      const rest = {
        ...(dish as Dish & {
          _id?: unknown;
          createdAt?: Date;
          updatedAt?: Date;
          __v?: number;
        }),
      };
      delete rest._id;
      delete rest.createdAt;
      delete rest.updatedAt;
      delete rest.__v;

      return {
        ...rest,
        menuId: new Types.ObjectId(toMenuId),
      };
    });
    await this.dishModel.insertMany(copies);
  }
}
