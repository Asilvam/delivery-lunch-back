import { IsIn } from 'class-validator';
import { OrderStatus } from '../constants/order.constants';

export class UpdateOrderStatusDto {
  @IsIn([OrderStatus.EN_PREPARACION, OrderStatus.ENTREGADO], {
    message: `estado debe ser uno de: ${Object.values(OrderStatus).join(', ')}`,
  })
  estado: OrderStatus;
}
