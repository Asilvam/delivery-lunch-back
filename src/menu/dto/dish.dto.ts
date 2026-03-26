export class DishDto {
  id: string;
  nombre: string;
  precio: number;
  imagen_url?: string;
  opciones?: string[];
  es_hipo?: boolean;
  stock?: number;
}
