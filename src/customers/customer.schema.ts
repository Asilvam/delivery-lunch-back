import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type CustomerDocument = HydratedDocument<Customer>;
@Schema({ collection: 'customers', timestamps: true })
export class Customer {
  @Prop({ required: true, unique: true }) googleId: string;
  @Prop({ required: true }) name: string;
  @Prop({ required: true }) email: string;
  @Prop({ default: false }) blocked: boolean;
  @Prop({ default: '' }) blockReason: string;
  @Prop() blockedAt?: Date;
  @Prop() blockedBy?: string;
  @Prop({ default: 0 }) authVersion: number;
  @Prop() lastLoginAt?: Date;
  @Prop() contactName?: string;
  @Prop() phone?: string;
  // Serializes order creation against an administrative block in the same transaction.
  @Prop({ default: 0 }) orderWrites: number;
}
export const CustomerSchema = SchemaFactory.createForClass(Customer);
