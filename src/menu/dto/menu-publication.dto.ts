import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class PublishedDishDto {
  @IsOptional() @IsMongoId() id?: string;
  @IsOptional() @IsMongoId() catalogoId?: string;
  @IsOptional() @IsInt() @Min(0) @Max(Number.MAX_SAFE_INTEGER) stock?: number;
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  expectedStock?: number;
  @IsOptional() @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER) precioEspecial?:
    number | null;
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  opcionesProteina?: string[];
}
export class UpdateMenuPublicationDto {
  @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER) precioBase: number;
  @IsDateString() expectedUpdatedAt: string;
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PublishedDishDto)
  platos: PublishedDishDto[];
}
