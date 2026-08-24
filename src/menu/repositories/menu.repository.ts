import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DishesRepository } from '../../dishes/repositories/dishes.repository';
import { CreateMenuDto } from '../dto/create-menu.dto';
import { UpdateMenuDto } from '../dto/update-menu.dto';
import { MenuStatus } from '../constants/menu-status.constants';
import { Menu, MenuDocument } from '../schemas/menu.schema';
import { MenuWithDishes } from '../types/menu-with-dishes.type';

type MenuLean = Menu & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  __v?: number;
};

@Injectable()
export class MenuRepository {
  private readonly logger = new Logger(MenuRepository.name);

  constructor(
    @InjectModel(Menu.name)
    private readonly menuModel: Model<MenuDocument>,
    private readonly dishesRepository: DishesRepository,
  ) {}

  async create(createMenuDto: CreateMenuDto): Promise<MenuWithDishes> {
    const { platos, status = MenuStatus.DRAFT, ...menuData } = createMenuDto;
    const menu = await new this.menuModel({ ...menuData, status }).save();

    try {
      await this.dishesRepository.createMany(menu._id.toString(), platos);
      const created = await this.findByIdWithDishes(menu._id.toString());
      if (!created) throw new Error('No se pudo recuperar el menu creado');
      return created;
    } catch (error) {
      await this.menuModel.findByIdAndDelete(menu._id);
      await this.dishesRepository.removeByMenuId(menu._id.toString());
      throw error;
    }
  }

  async findById(id: string): Promise<MenuLean | null> {
    return this.menuModel.findById(id).lean<MenuLean>();
  }

  async findByIdWithDishes(id: string): Promise<MenuWithDishes | null> {
    const menu = await this.menuModel.findById(id).lean<MenuLean>();
    if (!menu) return null;

    const platos = await this.dishesRepository.findByMenuId(id);
    return { ...menu, platos };
  }

  async findByDate(
    fecha: string,
    publishedOnly = false,
  ): Promise<MenuWithDishes | null> {
    this.logger.log(`Buscando menu por fecha: ${fecha}`);

    const menu = await this.menuModel
      .findOne({
        fecha,
        ...(publishedOnly
          ? {
              $or: [
                { status: MenuStatus.PUBLISHED },
                { status: { $exists: false } },
              ],
            }
          : {}),
      })
      .lean<MenuLean>();

    if (!menu) return null;

    const platos = await this.dishesRepository.findByMenuId(
      menu._id.toString(),
    );

    return { ...menu, platos };
  }

  async findByRange(from: string, to: string): Promise<MenuWithDishes[]> {
    const menus = await this.menuModel
      .find({ fecha: { $gte: from, $lte: to } })
      .sort({ fecha: 1 })
      .lean<MenuLean[]>();

    return Promise.all(
      menus.map(async (menu) => ({
        ...menu,
        platos: await this.dishesRepository.findByMenuId(menu._id.toString()),
      })),
    );
  }

  async update(
    id: string,
    updateMenuDto: UpdateMenuDto,
  ): Promise<MenuWithDishes | null> {
    const { platos, ...menuData } = updateMenuDto;
    const menu = await this.menuModel
      .findByIdAndUpdate(id, { $set: menuData }, { new: true })
      .lean<Menu>();

    if (!menu) return null;
    if (platos) await this.dishesRepository.replaceForMenu(id, platos);

    return this.findByIdWithDishes(id);
  }

  async updateStatus(
    id: string,
    status: MenuStatus,
  ): Promise<MenuWithDishes | null> {
    const menu = await this.menuModel
      .findByIdAndUpdate(id, { $set: { status } }, { new: true })
      .lean<Menu>();

    return menu ? this.findByIdWithDishes(id) : null;
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

    const rest = {
      ensalada: origin.ensalada,
      pan: origin.pan,
      postre: origin.postre,
    };

    const newMenu = new this.menuModel({
      ...rest,
      fecha,
      status: MenuStatus.DRAFT,
    });
    const saved = await newMenu.save();

    try {
      await this.dishesRepository.copyToMenu(id, saved._id.toString());
    } catch (error) {
      await this.menuModel.findByIdAndDelete(saved._id);
      await this.dishesRepository.removeByMenuId(saved._id.toString());
      throw error;
    }

    return this.findByDate(fecha);
  }
}
