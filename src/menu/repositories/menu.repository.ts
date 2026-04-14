import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DishesRepository } from '../../dishes/repositories/dishes.repository';
import { CreateMenuDto } from '../dto/create-menu.dto';
import { UpdateMenuDto } from '../dto/update-menu.dto';
import { Menu, MenuDocument } from '../schemas/menu.schema';
import { MenuWithDishes } from '../types/menu-with-dishes.type';

@Injectable()
export class MenuRepository {
  private readonly logger = new Logger(MenuRepository.name);

  constructor(
    @InjectModel(Menu.name)
    private readonly menuModel: Model<MenuDocument>,
    private readonly dishesRepository: DishesRepository,
  ) {}

  async create(createMenuDto: CreateMenuDto): Promise<MenuDocument> {
    const menu = new this.menuModel(createMenuDto);
    return menu.save();
  }

  async findById(id: string): Promise<Menu | null> {
    return this.menuModel.findById(id).lean<Menu>();
  }

  async findByDate(fecha: string): Promise<MenuWithDishes | null> {
    this.logger.log(`Buscando menu por fecha: ${fecha}`);

    const menu = await this.menuModel.findOne({ fecha }).lean<Menu>();

    if (!menu) return null;

    const platos = await this.dishesRepository.findByMenuId(
      (menu as any)._id.toString(),
    );

    return { ...(menu as any), platos };
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, ...rest } = origin as any;

    const newMenu = new this.menuModel({ ...rest, fecha });
    const saved = await newMenu.save();

    await this.dishesRepository.copyToMenu(id, saved._id.toString());

    return this.findByDate(fecha);
  }
}
