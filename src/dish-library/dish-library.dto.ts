import { PartialType } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateLibraryDishDto {
  @IsString() @IsNotEmpty() @MaxLength(160) nombre: string;
  @IsOptional() @IsString() @MaxLength(300) descripcion?: string;
  @IsString() @IsNotEmpty() @MaxLength(60) categoria: string;
  @IsUrl({ protocols: ['https'], require_protocol: true }) imagenUrl: string;
  @IsString() @IsNotEmpty() @MaxLength(300) imagenPublicId: string;
  @IsOptional() @IsBoolean() esHipo?: boolean;
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  opciones?: string[];
  @IsOptional() @IsBoolean() activo?: boolean;
  @IsOptional() @IsString() @MaxLength(500) notaInterna?: string;
}
export class UpdateLibraryDishDto extends PartialType(CreateLibraryDishDto) {}
