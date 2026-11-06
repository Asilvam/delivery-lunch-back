import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DateTime } from 'luxon';
import { toIsoDate } from '../common/utils/date.utils';
import { Menu } from './schemas/menu.schema';
import { MenuWithDishes } from './types/menu-with-dishes.type';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { MenuRepository } from './repositories/menu.repository';

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  constructor(private readonly menuRepository: MenuRepository) {}

  async create(createMenuDto: CreateMenuDto): Promise<Menu> {
    this.logger.log(`Creando menu para fecha: ${createMenuDto.fecha}`);
    const menu = await this.menuRepository.create(createMenuDto);
    this.logger.log(
      `Menu creado — id: ${menu._id.toString()}, fecha: ${createMenuDto.fecha}`,
    );
    return menu;
  }

  async findToday(): Promise<MenuWithDishes[]> {
    const today = toIsoDate(new Date());
    this.logger.log(`Buscando menu de hoy: ${today}`);
    return this.findByDate(today);
  }

  async findByDate(fecha: string): Promise<MenuWithDishes[]> {
    const menu = await this.menuRepository.findByDate(fecha);

    if (!menu) {
      this.logger.warn(`Menu no encontrado para fecha: ${fecha}`);
      throw new NotFoundException(`No existe menu para la fecha ${fecha}`);
    }

    return [menu];
  }

  async update(id: string, updateMenuDto: UpdateMenuDto): Promise<Menu> {
    this.logger.log(`Actualizando menu id: ${id}`);
    const menu = await this.menuRepository.update(id, updateMenuDto);

    if (!menu) {
      this.logger.warn(`Menu no encontrado para actualizar — id: ${id}`);
      throw new NotFoundException(`No existe menu con id ${id}`);
    }

    this.logger.log(`Menu actualizado — id: ${id}`);
    return menu;
  }

  async remove(id: string): Promise<Menu> {
    this.logger.log(`Eliminando menu id: ${id}`);
    const menu = await this.menuRepository.remove(id);

    if (!menu) {
      this.logger.warn(`Menu no encontrado para eliminar — id: ${id}`);
      throw new NotFoundException(`No existe menu con id ${id}`);
    }

    this.logger.log(`Menu eliminado — id: ${id}`);
    return menu;
  }

  async findAll() {
    return this.menuRepository.findAll();
  }

  async copy(id: string, fecha: string): Promise<MenuWithDishes[]> {
    this.logger.log(`Copiando menu id: ${id} a fecha: ${fecha}`);
    const menu = await this.menuRepository.findById(id);

    if (!menu) {
      this.logger.warn(`Menu origen no encontrado para copiar — id: ${id}`);
      throw new NotFoundException(`No existe menu con id ${id}`);
    }

    if (!DateTime.fromISO(fecha).isValid)
      throw new BadRequestException('La fecha no es válida.');
    let copied: MenuWithDishes | null;
    try {
      copied = await this.menuRepository.copy(id, fecha);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 11000
      )
        throw new ConflictException('Ya existe un menú para esa fecha.');
      throw error;
    }

    if (!copied) {
      this.logger.error(`Error al copiar menu — id: ${id} a fecha: ${fecha}`);
      throw new NotFoundException(`Error al copiar menu con id ${id}`);
    }

    this.logger.log(
      `Menu copiado exitosamente — origen: ${id}, nueva fecha: ${fecha}`,
    );
    return [copied];
  }
}
