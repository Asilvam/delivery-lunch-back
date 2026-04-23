import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class CreateDishDto {
  @IsMongoId()
  @ApiProperty({ example: 'MENU_ID', description: 'ID del menú asociado' })
  menuId: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Pollo asado', description: 'Nombre del plato' })
  nombre: string;

  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 4500, description: 'Precio en CLP' })
  precio: number;

  @IsOptional()
  @IsUrl()
  @ApiProperty({ required: false, example: 'https://cdn.../pollo.jpg', description: 'URL de la imagen del plato' })
  imagen_url?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  opciones?: string[];

  @IsOptional()
  @IsBoolean()
  es_hipo?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;
}
