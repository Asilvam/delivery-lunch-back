import { IsEnum } from 'class-validator';
import { OrderStatus } from '../constants/order.constants';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, {
    message: `estado debe ser uno de: ${Object.values(OrderStatus).join(', ')}`,
  })
  estado: OrderStatus;
}
