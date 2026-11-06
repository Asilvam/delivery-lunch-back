import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { CreateLibraryDishDto, UpdateLibraryDishDto } from './dish-library.dto';
import { DishLibraryService } from './dish-library.service';

@ApiTags('dish-library')
@ApiBearerAuth()
@Controller('dish-library')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class DishLibraryController {
  constructor(private readonly library: DishLibraryService) {}
  @Get() list() {
    return this.library.list();
  }
  @Post('import-initial') importInitial() {
    return this.library.importInitial();
  }
  @Post() create(@Body() input: CreateLibraryDishDto) {
    return this.library.create(input);
  }
  @Patch(':id') update(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() input: UpdateLibraryDishDto,
  ) {
    return this.library.update(id, input);
  }
}
