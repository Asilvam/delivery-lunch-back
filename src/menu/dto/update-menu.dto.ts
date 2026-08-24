import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { MenuStatus } from '../constants/menu-status.constants';
import { MenuDishInputDto } from './menu-dish-input.dto';

export class UpdateMenuDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ensalada?: string[];

  @IsOptional()
  @IsString()
  pan?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  postre?: string[];

  @IsOptional()
  @IsEnum(MenuStatus)
  status?: MenuStatus;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MenuDishInputDto)
  platos?: MenuDishInputDto[];
}
