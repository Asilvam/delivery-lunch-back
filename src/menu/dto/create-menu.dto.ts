import { IsArray, IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateMenuDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'fecha debe tener formato YYYY-MM-DD',
  })
  fecha: string;

  @IsArray()
  @IsString({ each: true })
  ensalada: string[];

  @IsString()
  @IsNotEmpty()
  pan: string;

  @IsArray()
  @IsString({ each: true })
  postre: string[];
}
