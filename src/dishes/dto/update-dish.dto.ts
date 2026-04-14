import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class UpdateDishDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precio?: number;

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
}
