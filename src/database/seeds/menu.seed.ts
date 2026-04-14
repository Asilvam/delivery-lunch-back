interface SeedDish {
  nombre: string;
  precio: number;
  imagen_url?: string;
  opciones?: string[];
  es_hipo?: boolean;
  stock: number;
}

interface SeedMenu {
  fecha: string;
  ensalada: string[];
  pan: string;
  postre: string[];
  platos: SeedDish[];
}

export const menuSeed: SeedMenu[] = [
  {
    fecha: '2026-04-14',
    ensalada: ['Ensalada surtida', 'Ensalada chilena', 'Repollo con zanahoria'],
    pan: 'Pan Fresco del dia',
    postre: ['Flan de vainilla', 'Jalea light'],
    platos: [
      {
        nombre: 'Pollo asado con arroz y papas fritas',
        precio: 5500,
        imagen_url:
          'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?q=80&w=400&auto=format&fit=crop',
        stock: 12,
      },
      {
        nombre: 'Pollo asado con fideos con salsa o crema',
        precio: 5500,
        imagen_url:
          'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?q=80&w=400&auto=format&fit=crop',
        stock: 5,
      },
      {
        nombre: 'Cerdo mongoliano con arroz',
        precio: 5500,
        imagen_url:
          'https://images.unsplash.com/photo-1604909052743-94e838986d24?q=80&w=400&auto=format&fit=crop',
        stock: 0,
      },
      {
        nombre: 'Cerdo mongoliano con fideos',
        precio: 5500,
        imagen_url:
          'https://images.unsplash.com/photo-1617093727343-374698b1b08d?q=80&w=400&auto=format&fit=crop',
        stock: 3,
      },
      {
        nombre: 'Porotos con riendas',
        precio: 5500,
        imagen_url:
          'https://images.unsplash.com/photo-1625943555403-8c4a5f5cfb89?q=80&w=400&auto=format&fit=crop',
        stock: 8,
      },
      {
        nombre: 'Hipo',
        precio: 5500,
        opciones: ['Pollo asado', 'Cerdo mongoliano', 'Atun'],
        es_hipo: true,
        imagen_url:
          'https://images.unsplash.com/photo-1563245372-f21724e3856d?q=80&w=400&auto=format&fit=crop',
        stock: 2,
      },
    ],
  },
];
