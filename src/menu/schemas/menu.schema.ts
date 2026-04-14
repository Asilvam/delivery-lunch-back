import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { MENU_COLLECTION } from '../constants/menu.constants';

export type MenuDocument = HydratedDocument<Menu>;

@Schema({ collection: MENU_COLLECTION, timestamps: true })
export class Menu {
  @Prop({ required: true, unique: true })
  fecha: string;

  @Prop({ type: [String], default: [] })
  ensalada: string[];

  @Prop({ required: true })
  pan: string;

  @Prop({ type: [String], default: [] })
  postre: string[];
}

export const MenuSchema = SchemaFactory.createForClass(Menu);
