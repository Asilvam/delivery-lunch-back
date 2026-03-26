import { DishDto } from './dish.dto';

export class DailyMenuDto {
  fecha: string;
  ensalada: string[];
  pan: string;
  postre: string[];
  platos: DishDto[];
}
