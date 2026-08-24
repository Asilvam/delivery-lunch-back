import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { MenuService } from './menu.service';
import { MenuWithDishes } from './types/menu-with-dishes.type';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get('today')
  async findToday(): Promise<MenuWithDishes[]> {
    return this.menuService.findToday();
  }

  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async findAdminRange(
    @Query('from') from: string,
    @Query('to') to: string,
  ): Promise<MenuWithDishes[]> {
    if (
      !from ||
      !to ||
      !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(to)
    ) {
      throw new BadRequestException(
        'from y to son requeridos con formato YYYY-MM-DD',
      );
    }
    if (from > to) {
      throw new BadRequestException('from no puede ser posterior a to');
    }
    return this.menuService.findByRange(from, to);
  }

  @Get(':fecha')
  async findByFecha(@Param('fecha') fecha: string): Promise<MenuWithDishes[]> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      throw new BadRequestException('fecha debe tener formato YYYY-MM-DD');
    }

    return this.menuService.findByDate(fecha);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  async create(@Body() createMenuDto: CreateMenuDto): Promise<MenuWithDishes> {
    return this.menuService.create(createMenuDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':id/copy')
  async copy(
    @Param('id') id: string,
    @Query('fecha') fecha: string,
  ): Promise<MenuWithDishes> {
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      throw new BadRequestException(
        'query param fecha es requerido con formato YYYY-MM-DD',
      );
    }

    return this.menuService.copy(id, fecha);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateMenuDto: UpdateMenuDto,
  ): Promise<MenuWithDishes> {
    return this.menuService.update(id, updateMenuDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/publish')
  async publish(@Param('id') id: string): Promise<MenuWithDishes> {
    return this.menuService.publish(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/archive')
  async archive(@Param('id') id: string): Promise<MenuWithDishes> {
    return this.menuService.archive(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.menuService.remove(id);
  }
}
