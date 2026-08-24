import {
  IsArray,
  IsBoolean,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class MenuDishInputDto {
  @IsOptional()
  @IsMongoId()
  id?: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsInt()
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

  @IsInt()
  @Min(0)
  stock: number;
}
