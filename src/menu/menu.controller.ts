import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateMenuDto } from './dto/create-menu.dto';
import { MenuService } from './menu.service';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Post()
  async create(@Body() createMenuDto: CreateMenuDto) {
    return this.menuService.create(createMenuDto);
  }

  @Get()
  async findAll() {
    return this.menuService.findAll();
  }

  @Get('today')
  async findToday() {
    return this.menuService.findToday();
  }
}
