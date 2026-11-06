import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsInt,
  IsMongoId,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';

export class DishPriceDto {
  @IsMongoId() id: string;
  @IsInt() @Min(1) precio: number;
}
export class UpdateMenuPricesDto {
  @IsInt() @Min(1) precioBase: number;
  @IsOptional() @IsDateString() expectedUpdatedAt?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((dish: DishPriceDto) => dish.id)
  @ValidateNested({ each: true })
  @Type(() => DishPriceDto)
  platos: DishPriceDto[];
}
