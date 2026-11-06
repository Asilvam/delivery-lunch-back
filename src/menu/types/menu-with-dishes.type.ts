import { Dish } from '../../dishes/schemas/dish.schema';

export interface MenuWithDishes {
  _id: unknown;
  fecha: string;
  estado?: 'borrador' | 'publicado';
  precioBase: number;
  ensalada: string[];
  pan: string;
  postre: string[];
  platos: Dish[];
  createdAt?: Date;
  updatedAt?: Date;
}
