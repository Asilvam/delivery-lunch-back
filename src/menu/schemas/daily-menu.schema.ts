import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Dish, DishSchema } from './dish.schema';

@Schema({ _id: false })
export class DailyMenu {
  @Prop({ required: true })
  fecha: string;

  @Prop({ type: [String], default: [] })
  ensalada: string[];

  @Prop({ required: true })
  pan: string;

  @Prop({ type: [String], default: [] })
  postre: string[];

  @Prop({ type: [DishSchema], default: [] })
  platos: Dish[];
}

export const DailyMenuSchema = SchemaFactory.createForClass(DailyMenu);
