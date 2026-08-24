import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { MenuStatus } from '../constants/menu-status.constants';
import { MenuDishInputDto } from './menu-dish-input.dto';

export class CreateMenuDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'fecha debe tener formato YYYY-MM-DD',
  })
  fecha: string;

  @IsArray()
  @IsString({ each: true })
  ensalada: string[];

  @IsString()
  @IsNotEmpty()
  pan: string;

  @IsArray()
  @IsString({ each: true })
  postre: string[];

  @IsOptional()
  @IsEnum(MenuStatus)
  status?: MenuStatus;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MenuDishInputDto)
  platos: MenuDishInputDto[];
}
