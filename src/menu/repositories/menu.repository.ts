import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateMenuDto } from '../dto/create-menu.dto';
import { Menu, MenuDocument } from '../schemas/menu.schema';

@Injectable()
export class MenuRepository {
  private readonly logger = new Logger(MenuRepository.name);

  constructor(
    @InjectModel(Menu.name)
    private readonly menuModel: Model<MenuDocument>,
  ) {}

  async create(createMenuDto: CreateMenuDto) {
    const created = new this.menuModel(createMenuDto);
    return created.save();
  }

  async findAll() {
    return this.menuModel.find().lean();
  }

  async findByDate(fecha: string) {
    this.logger.log(`Buscando menu por fecha: ${fecha}`);

    const menu = await this.menuModel
      .findOne({ 'data.fecha': fecha }, { data: { $elemMatch: { fecha } } })
      .lean();

    return menu?.data?.[0] ?? null;
  }
}
