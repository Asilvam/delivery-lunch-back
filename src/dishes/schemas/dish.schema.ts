import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';
import { DISHES_COLLECTION } from '../constants/dishes.constants';

export type DishDocument = HydratedDocument<Dish>;

@Schema({ collection: DISHES_COLLECTION, timestamps: true })
export class Dish {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'LibraryDish' })
  catalogoId?: Types.ObjectId;
  @Prop({ default: '' }) descripcion?: string;
  @Prop({ default: '' }) categoria?: string;
  @Prop() imagenPublicId?: string;
  @Prop({ type: Number, default: null }) precioEspecial?: number | null;
  @Prop({ min: 0 }) stockInicial?: number;
  @Prop({ default: 0 }) orden?: number;
  @Prop({ default: false }) retirado?: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Menu', required: true })
  menuId: Types.ObjectId;

  @Prop({ required: true })
  nombre: string;

  @Prop({ required: true })
  precio: number;

  @Prop()
  imagen_url?: string;

  @Prop({ type: [String], default: [] })
  opciones: string[];

  @Prop({ default: false })
  es_hipo: boolean;

  @Prop({ default: 0 })
  stock: number;
}

export const DishSchema = SchemaFactory.createForClass(Dish);
