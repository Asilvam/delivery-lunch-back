import { Dish } from '../../dishes/schemas/dish.schema';
import { MenuStatus } from '../constants/menu-status.constants';

export interface MenuWithDishes {
  _id: unknown;
  fecha: string;
  ensalada: string[];
  pan: string;
  postre: string[];
  status?: MenuStatus;
  platos: Dish[];
  createdAt?: Date;
  updatedAt?: Date;
}
