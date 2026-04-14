import { Dish } from '../../dishes/schemas/dish.schema';

export interface MenuWithDishes {
  _id: unknown;
  fecha: string;
  ensalada: string[];
  pan: string;
  postre: string[];
  platos: Dish[];
  createdAt?: Date;
  updatedAt?: Date;
}
