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

export class CreateDishDto {
  @IsMongoId()
  menuId: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsNumber()
  @Min(0)
  precio: number;

  @IsOptional()
  @IsUrl()
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
