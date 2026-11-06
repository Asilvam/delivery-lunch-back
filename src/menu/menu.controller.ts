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
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MenuCompositionService } from './menu-composition.service';
import { MenuCompositionDto } from './dto/menu-composition.dto';
import { MenuPricingService } from './menu-pricing.service';
import { UpdateMenuPricesDto } from './dto/update-menu-prices.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { MenuService } from './menu.service';
import { Menu } from './schemas/menu.schema';
import { MenuWithDishes } from './types/menu-with-dishes.type';

import {
  ApiTags,
  ApiBearerAuth,
  ApiOkResponse,
  ApiBody,
} from '@nestjs/swagger';
import { MenuWithDishesDto } from './dto/menu-with-dishes.dto';

@ApiTags('menu')
@ApiBearerAuth()
@Controller('menu')
export class MenuController {
  constructor(
    private readonly menuService: MenuService,
    private readonly pricing: MenuPricingService,
    private readonly composition: MenuCompositionService,
  ) {}

  @Patch(':id/prices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updatePrices(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: UpdateMenuPricesDto,
  ) {
    return this.pricing.update(id, dto);
  }

  @Get()
  async findAll() {
    return this.menuService.findAll();
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  listAdmin(@Query('fecha') fecha?: string) {
    return this.composition.list(fecha);
  }

  @Post('composition')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  createComposition(@Body() input: MenuCompositionDto) {
    return this.composition.save(input);
  }

  @Patch(':id/composition')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateComposition(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() input: MenuCompositionDto,
  ) {
    return this.composition.save(input, id);
  }

  @Get('today')
  @ApiOkResponse({ description: 'Menú del día', type: [MenuWithDishesDto] })
  async findToday(): Promise<MenuWithDishes[]> {
    return this.menuService.findToday();
  }

  @Get(':fecha')
  @ApiOkResponse({
    description: 'Menú de una fecha',
    type: [MenuWithDishesDto],
  })
  async findByFecha(@Param('fecha') fecha: string): Promise<MenuWithDishes[]> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      throw new BadRequestException('fecha debe tener formato YYYY-MM-DD');
    }

    return this.menuService.findByDate(fecha);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  @ApiBody({ type: CreateMenuDto })
  async create(@Body() createMenuDto: CreateMenuDto): Promise<Menu> {
    return this.menuService.create(createMenuDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':id/copy')
  async copy(
    @Param('id', ParseMongoIdPipe) id: string,
    @Query('fecha') fecha: string,
  ): Promise<MenuWithDishes[]> {
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
  @ApiBody({ type: UpdateMenuDto })
  async update(
    @Param('id') id: string,
    @Body() updateMenuDto: UpdateMenuDto,
  ): Promise<Menu> {
    return this.menuService.update(id, updateMenuDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.menuService.remove(id);
  }
}
