import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class Dish {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  nombre: string;

  @Prop({ required: true })
  precio: number;

  @Prop()
  imagen_url?: string;

  @Prop({ type: [String], default: [] })
  opciones?: string[];

  @Prop({ default: false })
  es_hipo?: boolean;

  @Prop({ default: 0 })
  stock?: number;
}

export const DishSchema = SchemaFactory.createForClass(Dish);
