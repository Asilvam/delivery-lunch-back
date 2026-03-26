import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { MENU_COLLECTION } from '../constants/menu.constants';
import { DailyMenu, DailyMenuSchema } from './daily-menu.schema';

export type MenuDocument = HydratedDocument<Menu>;

@Schema({ collection: MENU_COLLECTION, timestamps: true })
export class Menu {
  @Prop({ type: [DailyMenuSchema], default: [] })
  data: DailyMenu[];
}

export const MenuSchema = SchemaFactory.createForClass(Menu);
