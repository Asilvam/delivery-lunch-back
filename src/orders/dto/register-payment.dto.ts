import { IsIn } from 'class-validator';
export class RegisterPaymentDto {
  @IsIn(['efectivo', 'transferencia']) medioPago: 'efectivo' | 'transferencia';
}
