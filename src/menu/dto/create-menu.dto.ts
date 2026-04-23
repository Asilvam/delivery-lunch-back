import { IsArray, IsNotEmpty, IsString, Matches } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class CreateMenuDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'fecha debe tener formato YYYY-MM-DD',
  })
  @ApiProperty({ example: '2026-12-30', description: 'Fecha del menú en formato YYYY-MM-DD' })
  fecha: string;

  @IsArray()
  @IsString({ each: true })
  @ApiProperty({ type: [String], example: ['Ensalada César'], description: 'Lista de ensaladas del menú' })
  ensalada: string[];

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Marraqueta', description: 'Tipo de pan del menú' })
  pan: string;

  @IsArray()
  @IsString({ each: true })
  @ApiProperty({ type: [String], example: ['Arroz con leche'], description: 'Lista de postres del menú' })
  postre: string[];
}
