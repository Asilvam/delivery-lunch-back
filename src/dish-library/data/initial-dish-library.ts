// Fotos revisadas y subidas a Cloudinary. Importación explícita, sin sobrescribir fichas existentes.
export const INITIAL_DISH_LIBRARY = [
  {
    clave: 'pollo-asado-arroz-papas-fritas',
    nombre: 'Pollo asado con arroz y papas fritas',
    descripcion: '',
    categoria: 'Pollo',
    imagenUrl:
      'https://res.cloudinary.com/dsbpineil/image/upload/v1794003979/delivery-lunch/biblioteca/pollo-asado-arroz-papas-fritas-7be5b8760d4b.png',
    imagenPublicId:
      'delivery-lunch/biblioteca/pollo-asado-arroz-papas-fritas-7be5b8760d4b',
    esHipo: false,
    opciones: [],
    activo: true,
    notaInterna: '',
  },
  {
    clave: 'pollo-asado-fideos',
    nombre: 'Pollo asado con fideos con salsa o crema',
    descripcion: '',
    categoria: 'Pollo',
    imagenUrl:
      'https://res.cloudinary.com/dsbpineil/image/upload/v1794003981/delivery-lunch/biblioteca/pollo-asado-fideos-c3af6fde4fa3.png',
    imagenPublicId: 'delivery-lunch/biblioteca/pollo-asado-fideos-c3af6fde4fa3',
    esHipo: false,
    opciones: [],
    activo: true,
    notaInterna: '',
  },
  {
    clave: 'cerdo-mongoliano-arroz',
    nombre: 'Cerdo mongoliano con arroz',
    descripcion: '',
    categoria: 'Cerdo',
    imagenUrl:
      'https://res.cloudinary.com/dsbpineil/image/upload/v1794003981/delivery-lunch/biblioteca/cerdo-mongoliano-arroz-aac3bfcc4cf8.png',
    imagenPublicId:
      'delivery-lunch/biblioteca/cerdo-mongoliano-arroz-aac3bfcc4cf8',
    esHipo: false,
    opciones: [],
    activo: true,
    notaInterna: '',
  },
  {
    clave: 'cerdo-mongoliano-fideos',
    nombre: 'Cerdo mongoliano con fideos',
    descripcion: '',
    categoria: 'Cerdo',
    imagenUrl:
      'https://res.cloudinary.com/dsbpineil/image/upload/v1794003982/delivery-lunch/biblioteca/cerdo-mongoliano-fideos-5a39896645e3.png',
    imagenPublicId:
      'delivery-lunch/biblioteca/cerdo-mongoliano-fideos-5a39896645e3',
    esHipo: false,
    opciones: [],
    activo: true,
    notaInterna: '',
  },
  {
    clave: 'porotos-con-riendas',
    nombre: 'Porotos con riendas',
    descripcion: '',
    categoria: 'Legumbres',
    imagenUrl:
      'https://res.cloudinary.com/dsbpineil/image/upload/v1794003983/delivery-lunch/biblioteca/porotos-con-riendas-f424526f4013.png',
    imagenPublicId:
      'delivery-lunch/biblioteca/porotos-con-riendas-f424526f4013',
    esHipo: false,
    opciones: [],
    activo: true,
    notaInterna: '',
  },
  {
    clave: 'menu-hipocalorico',
    nombre: 'Menú hipocalórico',
    descripcion: '',
    categoria: 'Hipocalórico',
    imagenUrl:
      'https://res.cloudinary.com/dsbpineil/image/upload/v1794003988/delivery-lunch/biblioteca/menu-hipocalorico-ddc396ae1e79.png',
    imagenPublicId: 'delivery-lunch/biblioteca/menu-hipocalorico-ddc396ae1e79',
    esHipo: true,
    opciones: [
      'Pollo asado',
      'Atún',
      'Cerdo mongoliano',
      'Bife de cerdo',
      'Carne al jugo',
      'Pulpa asada',
    ],
    activo: true,
    notaInterna: '',
  },
  {
    clave: 'pollo-asado-arroz-papas-mayo',
    nombre: 'Pollo asado con arroz y papas mayo',
    descripcion: '',
    categoria: 'Pollo',
    imagenUrl:
      'https://res.cloudinary.com/dsbpineil/image/upload/v1794003991/delivery-lunch/biblioteca/pollo-asado-arroz-papas-mayo-e813ee638c31.png',
    imagenPublicId:
      'delivery-lunch/biblioteca/pollo-asado-arroz-papas-mayo-e813ee638c31',
    esHipo: false,
    opciones: [],
    activo: true,
    notaInterna: '',
  },
  {
    clave: 'pollo-krispy-arroz-papas-fritas',
    nombre: 'Pollo krispy con arroz y papas fritas',
    descripcion: '',
    categoria: 'Pollo',
    imagenUrl:
      'https://res.cloudinary.com/dsbpineil/image/upload/v1794003992/delivery-lunch/biblioteca/pollo-krispy-arroz-papas-fritas-3dd0e595e1a7.png',
    imagenPublicId:
      'delivery-lunch/biblioteca/pollo-krispy-arroz-papas-fritas-3dd0e595e1a7',
    esHipo: false,
    opciones: [],
    activo: true,
    notaInterna: '',
  },
  {
    clave: 'pollo-krispy-fideos-crema',
    nombre: 'Pollo krispy con fideos con crema',
    descripcion: '',
    categoria: 'Pollo',
    imagenUrl:
      'https://res.cloudinary.com/dsbpineil/image/upload/v1794003993/delivery-lunch/biblioteca/pollo-krispy-fideos-crema-62199ad34cb8.png',
    imagenPublicId:
      'delivery-lunch/biblioteca/pollo-krispy-fideos-crema-62199ad34cb8',
    esHipo: false,
    opciones: [],
    activo: true,
    notaInterna: '',
  },
  {
    clave: 'bife-pavo-arroz-papas-fritas',
    nombre: 'Bife de pechuga de pavo con arroz y papas fritas',
    descripcion: '',
    categoria: 'Pavo',
    imagenUrl:
      'https://res.cloudinary.com/dsbpineil/image/upload/v1794003995/delivery-lunch/biblioteca/bife-pavo-arroz-papas-fritas-879da6629525.png',
    imagenPublicId:
      'delivery-lunch/biblioteca/bife-pavo-arroz-papas-fritas-879da6629525',
    esHipo: false,
    opciones: [],
    activo: true,
    notaInterna: '',
  },
  {
    clave: 'bife-lomo-cerdo-arroz-papas-fritas',
    nombre: 'Bife de lomo de cerdo con arroz y papas fritas',
    descripcion: '',
    categoria: 'Cerdo',
    imagenUrl:
      'https://res.cloudinary.com/dsbpineil/image/upload/v1794003996/delivery-lunch/biblioteca/bife-lomo-cerdo-arroz-papas-fritas-d67bc83c561c.png',
    imagenPublicId:
      'delivery-lunch/biblioteca/bife-lomo-cerdo-arroz-papas-fritas-d67bc83c561c',
    esHipo: false,
    opciones: [],
    activo: true,
    notaInterna: '',
  },
  {
    clave: 'bife-lomo-cerdo-fideos',
    nombre: 'Bife de lomo de cerdo con fideos con salsa o crema',
    descripcion: '',
    categoria: 'Cerdo',
    imagenUrl:
      'https://res.cloudinary.com/dsbpineil/image/upload/v1794003997/delivery-lunch/biblioteca/bife-lomo-cerdo-fideos-567a5cb945ab.png',
    imagenPublicId:
      'delivery-lunch/biblioteca/bife-lomo-cerdo-fideos-567a5cb945ab',
    esHipo: false,
    opciones: [],
    activo: true,
    notaInterna:
      'La foto suministrada muestra fideos con salsa roja; no representa la variante con crema.',
  },
  {
    clave: 'pulpa-asada-arroz-papas-fritas',
    nombre: 'Pulpa asada con arroz y papas fritas',
    descripcion: '',
    categoria: 'Pulpa',
    imagenUrl:
      'https://res.cloudinary.com/dsbpineil/image/upload/v1794003999/delivery-lunch/biblioteca/pulpa-asada-arroz-papas-fritas-9f563e51e856.png',
    imagenPublicId:
      'delivery-lunch/biblioteca/pulpa-asada-arroz-papas-fritas-9f563e51e856',
    esHipo: false,
    opciones: [],
    activo: true,
    notaInterna: '',
  },
  {
    clave: 'pulpa-asada-pure',
    nombre: 'Pulpa asada con puré',
    descripcion: '',
    categoria: 'Pulpa',
    imagenUrl:
      'https://res.cloudinary.com/dsbpineil/image/upload/v1794004001/delivery-lunch/biblioteca/pulpa-asada-pure-bece92684ef5.png',
    imagenPublicId: 'delivery-lunch/biblioteca/pulpa-asada-pure-bece92684ef5',
    esHipo: false,
    opciones: [],
    activo: true,
    notaInterna: '',
  },
  {
    clave: 'pulpa-asada-fideos',
    nombre: 'Pulpa asada con fideos',
    descripcion: '',
    categoria: 'Pulpa',
    imagenUrl:
      'https://res.cloudinary.com/dsbpineil/image/upload/v1794004001/delivery-lunch/biblioteca/pulpa-asada-fideos-a78cd094b507.png',
    imagenPublicId: 'delivery-lunch/biblioteca/pulpa-asada-fideos-a78cd094b507',
    esHipo: false,
    opciones: [],
    activo: true,
    notaInterna: '',
  },
  {
    clave: 'carne-al-jugo-arroz-papas-fritas',
    nombre: 'Carne al jugo con arroz y papas fritas',
    descripcion: '',
    categoria: 'Carne al jugo',
    imagenUrl:
      'https://res.cloudinary.com/dsbpineil/image/upload/v1794004004/delivery-lunch/biblioteca/carne-al-jugo-arroz-papas-fritas-46b1ddfc7b82.png',
    imagenPublicId:
      'delivery-lunch/biblioteca/carne-al-jugo-arroz-papas-fritas-46b1ddfc7b82',
    esHipo: false,
    opciones: [],
    activo: true,
    notaInterna: '',
  },
  {
    clave: 'carne-al-jugo-fideos-salsa',
    nombre: 'Carne al jugo con fideos con salsa',
    descripcion: '',
    categoria: 'Carne al jugo',
    imagenUrl:
      'https://res.cloudinary.com/dsbpineil/image/upload/v1794004005/delivery-lunch/biblioteca/carne-al-jugo-fideos-salsa-35f1b91acc3f.png',
    imagenPublicId:
      'delivery-lunch/biblioteca/carne-al-jugo-fideos-salsa-35f1b91acc3f',
    esHipo: false,
    opciones: [],
    activo: true,
    notaInterna: '',
  },
  {
    clave: 'cazuela-vacuno',
    nombre: 'Cazuela de vacuno',
    descripcion: '',
    categoria: 'Tradicional',
    imagenUrl:
      'https://res.cloudinary.com/dsbpineil/image/upload/v1794004006/delivery-lunch/biblioteca/cazuela-vacuno-7ed88f9c62de.png',
    imagenPublicId: 'delivery-lunch/biblioteca/cazuela-vacuno-7ed88f9c62de',
    esHipo: false,
    opciones: [],
    activo: true,
    notaInterna: '',
  },
  {
    clave: 'lentejas-cerdo-horno',
    nombre: 'Lentejas con cerdo al horno',
    descripcion: '',
    categoria: 'Legumbres',
    imagenUrl:
      'https://res.cloudinary.com/dsbpineil/image/upload/v1794004006/delivery-lunch/biblioteca/lentejas-cerdo-horno-242fb553cb3f.png',
    imagenPublicId:
      'delivery-lunch/biblioteca/lentejas-cerdo-horno-242fb553cb3f',
    esHipo: false,
    opciones: [],
    activo: true,
    notaInterna: '',
  },
  {
    clave: 'zapallo-italiano-arroz-papas-fritas',
    nombre: 'Zapallo italiano con arroz y papas fritas',
    descripcion: '',
    categoria: 'Zapallo italiano',
    imagenUrl:
      'https://res.cloudinary.com/dsbpineil/image/upload/v1794004007/delivery-lunch/biblioteca/zapallo-italiano-arroz-papas-fritas-f40a882ff29d.png',
    imagenPublicId:
      'delivery-lunch/biblioteca/zapallo-italiano-arroz-papas-fritas-f40a882ff29d',
    esHipo: false,
    opciones: [],
    activo: true,
    notaInterna:
      'Se observa zapallo italiano en rodajas salteadas con arroz y papas fritas. Revisar ingredientes de la guarnición antes de publicar; algunas piezas parecen pasta.',
  },
  {
    clave: 'lasana',
    nombre: 'Lasaña',
    descripcion: '',
    categoria: 'Pastas',
    imagenUrl:
      'https://res.cloudinary.com/dsbpineil/image/upload/v1794004008/delivery-lunch/biblioteca/lasana-3e16d3366b78.png',
    imagenPublicId: 'delivery-lunch/biblioteca/lasana-3e16d3366b78',
    esHipo: false,
    opciones: [],
    activo: true,
    notaInterna:
      'Se observa lasaña con relleno de apariencia cárnica. Confirmar receta antes de describir sus ingredientes.',
  },
  {
    clave: 'charquican-huevo',
    nombre: 'Charquicán con huevo',
    descripcion: '',
    categoria: 'Tradicional',
    imagenUrl:
      'https://res.cloudinary.com/dsbpineil/image/upload/v1794004008/delivery-lunch/biblioteca/charquican-huevo-d3cfff4e4447.png',
    imagenPublicId: 'delivery-lunch/biblioteca/charquican-huevo-d3cfff4e4447',
    esHipo: false,
    opciones: [],
    activo: true,
    notaInterna: '',
  },
  {
    clave: 'charquican-bife-cerdo',
    nombre: 'Charquicán con bife de cerdo',
    descripcion: '',
    categoria: 'Tradicional',
    imagenUrl:
      'https://res.cloudinary.com/dsbpineil/image/upload/v1794004009/delivery-lunch/biblioteca/charquican-bife-cerdo-bf907dde7a07.png',
    imagenPublicId:
      'delivery-lunch/biblioteca/charquican-bife-cerdo-bf907dde7a07',
    esHipo: false,
    opciones: [],
    activo: true,
    notaInterna: '',
  },
];
