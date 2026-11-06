import { IsInt, Min } from 'class-validator';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateMenuDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  precioBase?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ensalada?: string[];

  @IsOptional()
  @IsString()
  pan?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  postre?: string[];
}
