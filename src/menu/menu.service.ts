import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { toIsoDate } from '../common/utils/date.utils';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { MenuRepository } from './repositories/menu.repository';
import { Menu } from './schemas/menu.schema';
import { MenuWithDishes } from './types/menu-with-dishes.type';
import { MenuStatus } from './constants/menu-status.constants';

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  constructor(private readonly menuRepository: MenuRepository) {}

  async create(createMenuDto: CreateMenuDto): Promise<MenuWithDishes> {
    this.logger.log(`Creando menu para fecha: ${createMenuDto.fecha}`);
    let menu: MenuWithDishes;
    try {
      menu = await this.menuRepository.create(createMenuDto);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          `Ya existe un menu para la fecha ${createMenuDto.fecha}`,
        );
      }
      throw error;
    }
    this.logger.log(
      `Menu creado — id: ${String(menu._id)}, fecha: ${createMenuDto.fecha}`,
    );
    return menu;
  }

  async findToday(): Promise<MenuWithDishes[]> {
    const today = toIsoDate(new Date());
    this.logger.log(`Buscando menu de hoy: ${today}`);
    return this.findByDate(today, true);
  }

  async findByDate(
    fecha: string,
    publishedOnly = true,
  ): Promise<MenuWithDishes[]> {
    const menu = await this.menuRepository.findByDate(fecha, publishedOnly);

    if (!menu) {
      this.logger.warn(`Menu no encontrado para fecha: ${fecha}`);
      return [];
    }

    return [menu];
  }

  async findByRange(from: string, to: string): Promise<MenuWithDishes[]> {
    return this.menuRepository.findByRange(from, to);
  }

  async update(
    id: string,
    updateMenuDto: UpdateMenuDto,
  ): Promise<MenuWithDishes> {
    this.logger.log(`Actualizando menu id: ${id}`);
    const menu = await this.menuRepository.update(id, updateMenuDto);

    if (!menu) {
      this.logger.warn(`Menu no encontrado para actualizar — id: ${id}`);
      throw new NotFoundException(`No existe menu con id ${id}`);
    }

    this.logger.log(`Menu actualizado — id: ${id}`);
    return menu;
  }

  async publish(id: string): Promise<MenuWithDishes> {
    const menu = await this.menuRepository.findByIdWithDishes(id);
    if (!menu) throw new NotFoundException(`No existe menu con id ${id}`);
    if (menu.platos.length === 0) {
      throw new BadRequestException(
        'El menu debe tener al menos un plato antes de publicarse',
      );
    }

    return (await this.menuRepository.updateStatus(
      id,
      MenuStatus.PUBLISHED,
    )) as MenuWithDishes;
  }

  async archive(id: string): Promise<MenuWithDishes> {
    const menu = await this.menuRepository.updateStatus(
      id,
      MenuStatus.ARCHIVED,
    );
    if (!menu) throw new NotFoundException(`No existe menu con id ${id}`);
    return menu;
  }

  async remove(id: string): Promise<Menu> {
    this.logger.log(`Eliminando menu id: ${id}`);
    const existing = await this.menuRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`No existe menu con id ${id}`);
    }
    if (existing.status !== MenuStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden eliminar menus que nunca han sido publicados',
      );
    }
    const menu = await this.menuRepository.remove(id);

    if (!menu) {
      this.logger.warn(`Menu no encontrado para eliminar — id: ${id}`);
      throw new NotFoundException(`No existe menu con id ${id}`);
    }

    this.logger.log(`Menu eliminado — id: ${id}`);
    return menu;
  }

  async copy(id: string, fecha: string): Promise<MenuWithDishes> {
    this.logger.log(`Copiando menu id: ${id} a fecha: ${fecha}`);
    const menu = await this.menuRepository.findById(id);

    if (!menu) {
      this.logger.warn(`Menu origen no encontrado para copiar — id: ${id}`);
      throw new NotFoundException(`No existe menu con id ${id}`);
    }

    let copied: MenuWithDishes | null;
    try {
      copied = await this.menuRepository.copy(id, fecha);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(`Ya existe un menu para la fecha ${fecha}`);
      }
      throw error;
    }

    if (!copied) {
      this.logger.error(`Error al copiar menu — id: ${id} a fecha: ${fecha}`);
      throw new NotFoundException(`Error al copiar menu con id ${id}`);
    }

    this.logger.log(
      `Menu copiado exitosamente — origen: ${id}, nueva fecha: ${fecha}`,
    );
    return copied;
  }

  private isDuplicateKeyError(error: unknown): error is { code: number } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    );
  }
}
