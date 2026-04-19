import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ORDERS_COLLECTION, OrderStatus } from '../constants/order.constants';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Dish', required: true })
  platoId: Types.ObjectId;

  @Prop({ required: true })
  nombre: string;

  @Prop({ required: true, min: 1 })
  cantidad: number;

  @Prop({ required: true, min: 0 })
  precio: number;

  @Prop({ type: Object, default: {} })
  selecciones: Record<string, string>;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ collection: ORDERS_COLLECTION, timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'Menu', required: true })
  menuId: Types.ObjectId;

  @Prop({ required: true })
  fecha: string;

  @Prop({ required: true })
  cliente: string;

  @Prop({ required: true })
  telefono: string;

  @Prop({ required: true, min: 0 })
  total: number;

  @Prop({
    type: String,
    enum: Object.values(OrderStatus),
    default: OrderStatus.PENDIENTE,
  })
  estado: OrderStatus;

  @Prop({ type: [OrderItemSchema], default: [] })
  items: OrderItem[];

  @Prop({ type: Boolean, default: false })
  validadoPorAdmin: boolean;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ estado: 1, createdAt: -1 });
OrderSchema.index({ 'items.platoId': 1 });
