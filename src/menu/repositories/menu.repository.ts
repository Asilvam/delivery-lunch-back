import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Connection, Types } from 'mongoose';
import { MENU_PRICE } from '../constants/menu.constants';
import { DishesRepository } from '../../dishes/repositories/dishes.repository';
import { CreateMenuDto } from '../dto/create-menu.dto';
import { UpdateMenuDto } from '../dto/update-menu.dto';
import { Menu, MenuDocument } from '../schemas/menu.schema';
import { MenuWithDishes } from '../types/menu-with-dishes.type';

@Injectable()
export class MenuRepository {
  private readonly logger = new Logger(MenuRepository.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Menu.name)
    private readonly menuModel: Model<MenuDocument>,
    private readonly dishesRepository: DishesRepository,
  ) {}

  async create(createMenuDto: CreateMenuDto): Promise<MenuDocument> {
    const menu = new this.menuModel(createMenuDto);
    return menu.save();
  }

  async findAll(): Promise<Menu[]> {
    return this.menuModel.find({ estado: { $ne: 'borrador' } }).lean<Menu[]>();
  }

  async findById(id: string, session?: ClientSession): Promise<Menu | null> {
    return this.menuModel
      .findById(id)
      .session(session ?? null)
      .lean<Menu>();
  }

  async findByDate(
    fecha: string,
    includeDraft = false,
  ): Promise<MenuWithDishes | null> {
    this.logger.log(`Buscando menu por fecha: ${fecha}`);

    const menu = await this.menuModel
      .findOne({
        fecha,
        ...(!includeDraft ? { estado: { $ne: 'borrador' } } : {}),
      })
      .lean<Menu & { _id: Types.ObjectId }>();

    if (!menu) return null;

    const platos = await this.dishesRepository.findByMenuId(
      menu._id.toString(),
    );

    return {
      ...menu,
      precioBase: menu.precioBase ?? MENU_PRICE,
      platos,
    };
  }

  async update(id: string, updateMenuDto: UpdateMenuDto): Promise<Menu | null> {
    return this.menuModel
      .findByIdAndUpdate(id, { $set: updateMenuDto }, { new: true })
      .lean<Menu>();
  }

  async remove(id: string): Promise<Menu | null> {
    const menu = await this.menuModel.findByIdAndDelete(id).lean<Menu>();

    if (menu) {
      await this.dishesRepository.removeByMenuId(id);
    }

    return menu;
  }

  async copy(id: string, fecha: string): Promise<MenuWithDishes | null> {
    const origin = await this.menuModel.findById(id).lean<Menu>();

    if (!origin) return null;

    await this.connection.transaction(async (session) => {
      const newMenu = new this.menuModel({
        fecha,
        precioBase: origin.precioBase ?? MENU_PRICE,
        ensalada: origin.ensalada,
        pan: origin.pan,
        postre: origin.postre,
        estado: 'borrador',
      });
      const saved = await newMenu.save({ session });
      await this.dishesRepository.copyToMenu(id, saved._id.toString(), session);
    });
    return this.findByDate(fecha, true);
  }
}
