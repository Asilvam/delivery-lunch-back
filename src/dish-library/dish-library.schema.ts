import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LibraryDishDocument = HydratedDocument<LibraryDish>;

@Schema({ collection: 'dish_library', timestamps: true })
export class LibraryDish {
  @Prop({ required: true, unique: true }) clave: string;
  @Prop({ required: true, trim: true }) nombre: string;
  @Prop({ default: '', trim: true }) descripcion: string;
  @Prop({ required: true, trim: true }) categoria: string;
  @Prop({ required: true }) imagenUrl: string;
  @Prop({ required: true }) imagenPublicId: string;
  @Prop({ default: false }) esHipo: boolean;
  @Prop({ type: [String], default: [] }) opciones: string[];
  @Prop({ default: true }) activo: boolean;
  @Prop({ default: '' }) notaInterna: string;
}
export const LibraryDishSchema = SchemaFactory.createForClass(LibraryDish);
