import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type CustomerSessionDocument = HydratedDocument<CustomerSessionRecord>;
@Schema({ collection: 'customer_sessions', timestamps: true })
export class CustomerSessionRecord {
  @Prop({ required: true, unique: true }) tokenHash: string;
  @Prop({ required: true, index: true }) googleId: string;
  @Prop({ required: true }) authVersion: number;
  @Prop({ required: true }) expiresAt: Date;
  @Prop({ required: true }) lastUsedAt: Date;
}
export const CustomerSessionSchema = SchemaFactory.createForClass(
  CustomerSessionRecord,
);
CustomerSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
