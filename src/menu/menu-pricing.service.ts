import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Menu, MenuDocument } from './schemas/menu.schema';
import { Dish, DishDocument } from '../dishes/schemas/dish.schema';
import { UpdateMenuPricesDto } from './dto/update-menu-prices.dto';
import { MenuWithDishes } from './types/menu-with-dishes.type';

@Injectable()
export class MenuPricingService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Menu.name) private readonly menus: Model<MenuDocument>,
    @InjectModel(Dish.name) private readonly dishes: Model<DishDocument>,
  ) {}

  async update(id: string, dto: UpdateMenuPricesDto): Promise<MenuWithDishes> {
    return this.connection.transaction(async (session) => {
      const menu = await this.menus.findById(id).session(session).lean();
      if (!menu) throw new NotFoundException('No existe el menú');
      const current = await this.dishes
        .find({ menuId: new Types.ObjectId(id) })
        .session(session)
        .lean();
      const ids = new Set(current.map((dish) => String(dish._id)));
      if (
        new Set(dto.platos.map((dish) => dish.id)).size !== dto.platos.length ||
        dto.platos.length !== current.length ||
        dto.platos.some((dish) => !ids.has(dish.id))
      ) {
        throw new BadRequestException(
          'La lista de platos cambió. Recarga el menú antes de guardar.',
        );
      }
      const updated = await this.menus
        .findOneAndUpdate(
          {
            _id: id,
            ...(dto.expectedUpdatedAt
              ? { updatedAt: new Date(dto.expectedUpdatedAt) }
              : {}),
          },
          { $set: { precioBase: dto.precioBase } },
          { new: true, runValidators: true, session },
        )
        .lean();
      if (!updated)
        throw new ConflictException(
          'Otro administrador modificó el menú. Recarga los precios.',
        );
      await this.dishes.bulkWrite(
        dto.platos.map((dish) => ({
          updateOne: {
            filter: {
              _id: new Types.ObjectId(dish.id),
              menuId: new Types.ObjectId(id),
            },
            update: { $set: { precio: dish.precio } },
          },
        })),
        { session },
      );
      const platos = await this.dishes
        .find({ menuId: new Types.ObjectId(id) })
        .session(session)
        .lean<Dish[]>();
      return { ...updated, platos };
    });
  }
}
