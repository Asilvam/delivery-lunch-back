import { IsIn } from 'class-validator';
import { OrderStatus } from '../constants/order.constants';

const PROGRESS_STATUSES = [
  OrderStatus.EN_PREPARACION,
  OrderStatus.ENTREGADO,
] as const;

export type ProgressOrderStatus = (typeof PROGRESS_STATUSES)[number];

export class UpdateOrderStatusDto {
  @IsIn(PROGRESS_STATUSES, {
    message: `estado debe ser uno de: ${PROGRESS_STATUSES.join(', ')}`,
  })
  estado: ProgressOrderStatus;
}
