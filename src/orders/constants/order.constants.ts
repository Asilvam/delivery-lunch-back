export const ORDERS_COLLECTION = 'orders';

export enum OrderStatus {
  PENDIENTE = 'pendiente',
  EN_PREPARACION = 'en_preparacion',
  ENTREGADO = 'entregado',
  CANCELADO = 'cancelado',
}

export enum SseChannel {
  ADMIN = 'admin',
  KITCHEN = 'kitchen',
}
