import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class MenuCompositionDishDto {
  @IsMongoId() catalogoId: string;
  @IsInt() @Min(0) @Max(Number.MAX_SAFE_INTEGER) stock: number;
  @IsOptional() @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER) precioEspecial?:
    number | null;
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  opcionesProteina?: string[];
}
export class MenuCompositionDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  fecha: string;
  @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER) precioBase: number;
  @IsIn(['borrador', 'publicado']) estado: 'borrador' | 'publicado';
  @IsArray()
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  @ArrayMinSize(1)
  ensalada: string[];
  @IsString() @IsNotEmpty() @MaxLength(120) pan: string;
  @IsArray()
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  @ArrayMinSize(1)
  postre: string[];
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => MenuCompositionDishDto)
  platos: MenuCompositionDishDto[];
  @IsOptional() @IsDateString() expectedUpdatedAt?: string;
}
