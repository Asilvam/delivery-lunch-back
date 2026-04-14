import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateMenuDto {
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
