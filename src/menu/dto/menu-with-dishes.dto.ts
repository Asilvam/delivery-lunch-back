import { ApiProperty } from '@nestjs/swagger';

export class MenuWithDishesDto {
  @ApiProperty({ example: '644d6fd1b63d95c0f80de42c' })
  _id: string;

  @ApiProperty({ example: '2026-04-21' })
  fecha: string;

  @ApiProperty({ type: [String], example: ['César', 'Chilena'] })
  ensalada: string[];

  @ApiProperty({ example: 'Marraqueta' })
  pan: string;

  @ApiProperty({ type: [String], example: ['Arroz con leche'] })
  postre: string[];

  @ApiProperty({
    example: [
      {
        _id: '645d5f9db63d95c0f81de650',
        nombre: 'Pollo asado',
        precio: 4800,
        stock: 10,
      }
    ]
  })
  platos: any[];

  @ApiProperty({ required: false })
  createdAt?: Date;

  @ApiProperty({ required: false })
  updatedAt?: Date;
}
