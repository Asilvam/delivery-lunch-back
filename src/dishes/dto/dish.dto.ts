import { ApiProperty } from '@nestjs/swagger';

export class DishDto {
  @ApiProperty({ example: '645d5f9db63d95c0f81de650' })
  _id: string;

  @ApiProperty({ example: '644d6fd1b63d95c0f80de42c' })
  menuId: string;

  @ApiProperty({ example: 'Pollo asado' })
  nombre: string;

  @ApiProperty({ example: 4800 })
  precio: number;

  @ApiProperty({ example: 'https://cdn.ejemplo.com/pollo.jpg', required: false })
  imagen_url?: string;

  @ApiProperty({ type: [String], example: ['sin sal', 'vegetariano'], required: false })
  opciones?: string[];

  @ApiProperty({ example: false, required: false })
  es_hipo?: boolean;

  @ApiProperty({ example: 15 })
  stock: number;
}
