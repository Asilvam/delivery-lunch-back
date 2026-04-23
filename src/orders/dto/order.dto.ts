import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../constants/order.constants';

export class OrderItemDto {
  @ApiProperty({ example: 'PLATO_ID' })
  platoId: string;

  @ApiProperty({ example: 'Pollo asado' })
  nombre: string;

  @ApiProperty({ example: 2 })
  cantidad: number;

  @ApiProperty({ example: 4500 })
  precio: number;

  @ApiProperty({ example: { acompanamiento: 'arroz' }, required: false })
  selecciones?: Record<string, string>;
}

export class OrderDto {
  @ApiProperty({ example: 'ORDER_ID' })
  _id: string;

  @ApiProperty({ example: 'MENU_ID' })
  menuId: string;

  @ApiProperty({ example: '2026-04-21' })
  fecha: string;

  @ApiProperty({ example: 'Juan Test' })
  cliente: string;

  @ApiProperty({ example: '+56911111111' })
  telefono: string;

  @ApiProperty({ example: 5000 })
  total: number;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PENDIENTE })
  estado: OrderStatus;

  @ApiProperty({ type: [OrderItemDto] })
  items: OrderItemDto[];

  @ApiProperty({ example: false })
  validadoPorAdmin: boolean;

  @ApiProperty({ required: false })
  aceptadoEn?: Date;

  @ApiProperty({ required: false })
  entregadoEn?: Date;

  @ApiProperty({ required: false })
  canceladoEn?: Date;
}
