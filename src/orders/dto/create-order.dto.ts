import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrderItemDto {
  @IsMongoId()
  platoId: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsNumber()
  @Min(1)
  cantidad: number;

  @IsNumber()
  @IsPositive()
  precio: number;

  @IsObject()
  @IsOptional()
  selecciones?: Record<string, string>;
}

export class CreateOrderDto {
  @IsMongoId()
  menuId: string;

  @IsDateString()
  fecha: string;

  @IsString()
  @IsNotEmpty()
  cliente: string;

  @IsString()
  @IsNotEmpty()
  telefono: string;

  @IsNumber()
  @IsPositive()
  total: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
