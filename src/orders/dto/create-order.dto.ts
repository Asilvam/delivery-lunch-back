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

import { ApiProperty } from '@nestjs/swagger';

export class OrderItemDto {
  @IsMongoId()
  @ApiProperty({ example: 'PLATO_ID', description: 'ID del plato ordenado' })
  platoId: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Pollo asado', description: 'Nombre del plato ordenado' })
  nombre: string;

  @IsNumber()
  @Min(1)
  @ApiProperty({ example: 1, description: 'Cantidad ordenada de este ítem' })
  cantidad: number;

  @IsNumber()
  @IsPositive()
  @ApiProperty({ example: 4500, description: 'Precio unitario del plato' })
  precio: number;

  @IsObject()
  @IsOptional()
  @ApiProperty({ example: { acompanamiento: 'arroz' }, description: 'Selección de opciones, si aplica', required: false })
  selecciones?: Record<string, string>;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'MENU_ID', description: 'ID del menú seleccionado' })
  @IsMongoId()
  @ApiProperty({ example: 'MENU_ID', description: 'ID del menú de la orden' })
  menuId: string;

  @IsDateString()
  @ApiProperty({ example: '2026-12-30', description: 'Fecha de la orden, formato YYYY-MM-DD' })
  fecha: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Juan Pérez', description: 'Nombre cliente' })
  cliente: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '+56911111111', description: 'Teléfono del cliente' })
  telefono: string;

  @IsNumber()
  @IsPositive()
  @ApiProperty({ example: 5000, description: 'Monto total de la orden' })
  total: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @ApiProperty({ type: [OrderItemDto], description: 'Items de la orden' })
  items: OrderItemDto[];
}
