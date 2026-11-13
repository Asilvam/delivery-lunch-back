import * as dates from '../common/utils/date.utils';
import * as orderingHours from '../common/utils/ordering-hours';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { Model } from 'mongoose';
import request, { Test as HttpTest } from 'supertest';
import type { Server } from 'node:http';
import { DishLibraryModule } from '../dish-library/dish-library.module';
import {
  LibraryDish,
  LibraryDishDocument,
} from '../dish-library/dish-library.schema';
import { MenuModule } from './menu.module';
import { OrdersModule } from '../orders/orders.module';
import { UploadModule } from '../upload/upload.module';
import { WhatsappService } from '../orders/services/whatsapp.service';
import { Menu, MenuDocument } from './schemas/menu.schema';
import { Dish, DishDocument } from '../dishes/schemas/dish.schema';

interface SavedMenu {
  venceEn?: string;
  _id: string;
  estado: string;
  updatedAt: string;
  platos: {
    _id: string;
    nombre: string;
    descripcion: string;
    precio: number;
    stock: number;
    opciones: string[];
    catalogoId?: string;
    retirado?: boolean;
    tienePedidos?: boolean;
  }[];
}
const body = async <T>(query: HttpTest, status = 200): Promise<T> =>
  (await query.expect(status)).body as T;
jest.setTimeout(180000);
describe('Dish library and daily menu flow (isolated MongoDB)', () => {
  let app: INestApplication;
  let mongo: MongoMemoryReplSet;
  let admin: string, customer: string, kitchen: string;
  let library: Model<LibraryDishDocument>;
  let menus: Model<MenuDocument>;
  let dishes: Model<DishDocument>;
  const notify = jest.fn().mockResolvedValue(undefined);
  const http = () => request(app.getHttpServer() as Server);
  const api = (token: string) => ({ Authorization: `Bearer ${token}` });
  beforeAll(async () => {
    jest.spyOn(orderingHours, 'isOrderingOpen').mockReturnValue(true);
    jest.spyOn(dates, 'toIsoDate').mockReturnValue('2030-11-06');
    mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              JWT_SECRET: 'isolated-library-test-secret',
              JWT_EXPIRES_IN: '1h',
              GOOGLE_CLIENT_ID: 'test-client',
              CLOUDINARY_CLOUD_NAME: 'dsbpineil',
              CLOUDINARY_API_KEY: 'test',
              CLOUDINARY_API_SECRET: 'test',
              WHATSAPP_NOTIFY_PHONE: '',
              CALLMEBOT_API_KEY: '',
            }),
          ],
        }),
        MongooseModule.forRoot(mongo.getUri()),
        DishLibraryModule,
        MenuModule,
        OrdersModule,
        UploadModule,
      ],
    })
      .overrideProvider(WhatsappService)
      .useValue({ notifyOrder: notify })
      .compile();
    app = module.createNestApplication();
    app.useLogger(false);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    const jwt = app.get(JwtService);
    admin = jwt.sign({ sub: 'admin', role: 'admin' });
    customer = jwt.sign({
      sub: 'test-customer',
      role: 'customer',
      email: 'customer@example.test',
    });
    kitchen = jwt.sign({ sub: 'kitchen', role: 'kitchen' });
    library = app.get(getModelToken(LibraryDish.name));
    menus = app.get(getModelToken(Menu.name));
    dishes = app.get(getModelToken(Dish.name));
    await menus.init();
    await library.init();
  });
  afterAll(async () => {
    if (app) await app.close();
    if (mongo) await mongo.stop();
    jest.restoreAllMocks();
  });

  it('requires admin for library, draft access, import, publication and uploads', async () => {
    await http().get('/dish-library').expect(401);
    await http()
      .post('/dish-library/import-initial')
      .set(api(kitchen))
      .expect(403);
    await http().get('/menu/admin').set(api(customer)).expect(403);
    await http()
      .post('/menu/composition')
      .set(api(kitchen))
      .send({})
      .expect(403);
    await http().post('/upload/image').set(api(customer)).expect(403);
    await http().post('/upload/image').set(api(admin)).expect(400);
  });
  it('imports 23 Cloudinary-backed dishes idempotently and preserves admin edits', async () => {
    const first = await body<{ agregados: number }>(
      http().post('/dish-library/import-initial').set(api(admin)),
      201,
    );
    expect(first.agregados).toBe(23);
    const dish = await library.findOne({
      clave: 'pollo-asado-arroz-papas-fritas',
    });
    await http()
      .patch(`/dish-library/${String(dish!._id)}`)
      .set(api(admin))
      .send({ descripcion: 'Descripción personalizada' })
      .expect(200);
    const second = await body<{ agregados: number }>(
      http().post('/dish-library/import-initial').set(api(admin)),
      201,
    );
    expect(second.agregados).toBe(0);
    expect(await library.countDocuments()).toBe(23);
    expect((await library.findById(dish!._id))!.descripcion).toBe(
      'Descripción personalizada',
    );
    await http()
      .post('/dish-library')
      .set(api(admin))
      .send({
        nombre: 'Prueba',
        categoria: 'Pollo',
        imagenUrl: 'https://example.com/image.png',
        imagenPublicId: 'image',
      })
      .expect(400);
  });
  it('saves a hidden draft, inherits prices and publishes snapshots with only hipo proteins', async () => {
    const chicken = await library.findOne({
      clave: 'pollo-asado-arroz-papas-fritas',
    });
    const hipo = await library.findOne({ clave: 'menu-hipocalorico' });
    const input = {
      fecha: '2030-11-06',
      precioBase: 5500,
      estado: 'borrador',
      ensalada: ['Ensalada surtida'],
      pan: 'Pan fresco del día',
      postre: ['Flan'],
      platos: [
        {
          catalogoId: String(chicken!._id),
          stock: 10,
          precioEspecial: null,
          opcionesProteina: [],
        },
        {
          catalogoId: String(hipo!._id),
          stock: 4,
          precioEspecial: 5800,
          opcionesProteina: ['Atún'],
        },
      ],
    };
    const draft = await body<SavedMenu>(
      http().post('/menu/composition').set(api(admin)).send(input),
      201,
    );
    await http().get('/menu/2030-11-06').expect(404);
    expect(await body<unknown[]>(http().get('/menu'))).toHaveLength(0);
    expect(draft.platos.map((p) => p.precio)).toEqual([5500, 5800]);
    await http()
      .post('/orders')
      .set(api(customer))
      .set('Idempotency-Key', '00000000-0000-4000-8000-000000000001')
      .send({
        menuId: draft._id,
        fecha: input.fecha,
        cliente: 'Prueba',
        telefono: '+56900000000',
        total: 5500,
        items: [
          {
            platoId: draft.platos[0]._id,
            nombre: 'Pollo',
            precio: 5500,
            cantidad: 1,
          },
        ],
      })
      .expect(400);
    expect(notify).not.toHaveBeenCalled();
    const publish = {
      ...input,
      estado: 'publicado',
      expectedUpdatedAt: draft.updatedAt,
    };
    const published = await body<SavedMenu>(
      http()
        .patch(`/menu/${draft._id}/composition`)
        .set(api(admin))
        .send(publish),
    );
    expect(published.estado).toBe('publicado');
    expect(published.platos[1].opciones).toEqual(['Atún']);
    await http()
      .patch(`/menu/${draft._id}/composition`)
      .set(api(admin))
      .send(publish)
      .expect(409);
    const originalName = published.platos[0].nombre;
    await http()
      .patch(`/dish-library/${String(chicken!._id)}`)
      .set(api(admin))
      .send({ nombre: 'Nombre nuevo para futuros menús' })
      .expect(200);
    const [unchanged] = await body<SavedMenu[]>(http().get('/menu/2030-11-06'));
    expect(unchanged.venceEn).toBe('2030-11-06T19:00:00.000Z');
    expect(unchanged.platos[0].nombre).toBe(originalName);
    expect(unchanged.platos[0].descripcion).toBe('Descripción personalizada');
    await http()
      .post('/menu/composition')
      .set(api(admin))
      .send(input)
      .expect(409);
    expect(await dishes.countDocuments({ menuId: draft._id })).toBe(2);
  });
  it('copies into a new draft with fresh IDs and zero stock, without partial duplicates', async () => {
    const [source] = await body<SavedMenu[]>(http().get('/menu/2030-11-06'));
    const [copy] = await body<SavedMenu[]>(
      http().post(`/menu/${source._id}/copy?fecha=2030-11-07`).set(api(admin)),
      201,
    );
    expect(copy.estado).toBe('borrador');
    expect(copy.platos).toHaveLength(2);
    for (const dish of copy.platos) {
      expect(dish.stock).toBe(0);
      expect(source.platos.some((p) => p._id === dish._id)).toBe(false);
    }
    await http().get('/menu/2030-11-07').expect(404);
    await http()
      .post(`/menu/${source._id}/copy?fecha=2030-11-07`)
      .set(api(admin))
      .expect(409);
    expect(await menus.countDocuments({ fecha: '2030-11-07' })).toBe(1);
  });
  it('rejects invalid proteins, zero portions and archived dishes without persisting a partial menu', async () => {
    const regular = await library.findOne({
      clave: 'carne-al-jugo-arroz-papas-fritas',
    });
    const hipo = await library.findOne({ clave: 'menu-hipocalorico' });
    const input = {
      fecha: '2030-11-08',
      precioBase: 5500,
      estado: 'publicado',
      ensalada: ['Ensalada surtida'],
      pan: 'Pan fresco del día',
      postre: ['Fruta'],
      platos: [
        {
          catalogoId: String(hipo!._id),
          stock: 3,
          precioEspecial: null,
          opcionesProteina: [],
        },
      ],
    };
    await http()
      .post('/menu/composition')
      .set(api(admin))
      .send(input)
      .expect(400);
    await http()
      .post('/menu/composition')
      .set(api(admin))
      .send({
        ...input,
        platos: [
          { catalogoId: String(regular!._id), stock: 0, precioEspecial: null },
        ],
      })
      .expect(400);
    await http()
      .post('/menu/composition')
      .set(api(admin))
      .send({
        ...input,
        platos: [
          {
            catalogoId: String(regular!._id),
            stock: 5,
            precioEspecial: null,
            opcionesProteina: ['Atún'],
          },
        ],
      })
      .expect(400);
    await http()
      .patch(`/dish-library/${String(regular!._id)}`)
      .set(api(admin))
      .send({ activo: false })
      .expect(200);
    await http()
      .post('/menu/composition')
      .set(api(admin))
      .send({
        ...input,
        platos: [
          { catalogoId: String(regular!._id), stock: 5, precioEspecial: null },
        ],
      })
      .expect(400);
    expect(await menus.countDocuments({ fecha: input.fecha })).toBe(0);
  });
  it('edits a publication without losing stock, changing order snapshots or deleting referenced dishes', async () => {
    jest.mocked(dates.toIsoDate).mockReturnValue('2031-01-02');
    const regular = (await library.findOne({ clave: 'porotos-con-riendas' }))!;
    const second = (await library.findOne({
      clave: 'pollo-krispy-arroz-papas-fritas',
    }))!;
    const added = (await library.findOne({
      clave: 'pollo-asado-arroz-papas-mayo',
    }))!;
    const published = await body<SavedMenu>(
      http()
        .post('/menu/composition')
        .set(api(admin))
        .send({
          fecha: '2031-01-02',
          precioBase: 5500,
          estado: 'publicado',
          ensalada: ['Ensalada'],
          pan: 'Pan',
          postre: ['Fruta'],
          platos: [
            { catalogoId: String(regular._id), stock: 10 },
            { catalogoId: String(second._id), stock: 5 },
          ],
        }),
      201,
    );
    const firstId = published.platos[0]._id,
      secondId = published.platos[1]._id;
    const orderInput = {
      menuId: published._id,
      fecha: '2031-01-02',
      cliente: 'Prueba',
      telefono: '+56900000000',
      total: 11000,
      items: [
        { platoId: firstId, nombre: regular.nombre, precio: 5500, cantidad: 2 },
      ],
    };
    const requestId = '00000000-0000-4000-8000-000000000002';
    const order = await body<{ _id: string }>(
      http()
        .post('/orders')
        .set(api(customer))
        .set('Idempotency-Key', requestId)
        .send(orderInput),
      201,
    );
    const input = {
      expectedUpdatedAt: published.updatedAt,
      precioBase: 5500,
      platos: [
        {
          id: firstId,
          catalogoId: String(regular._id),
          stock: 12,
          expectedStock: 8,
          precioEspecial: 5900,
          opcionesProteina: [],
        },
        { catalogoId: String(added._id), stock: 0, precioEspecial: null },
      ],
    };
    await http()
      .patch(`/menu/${published._id}/publication`)
      .set(api(kitchen))
      .send(input)
      .expect(403);
    let edited = await body<SavedMenu>(
      http()
        .patch(`/menu/${published._id}/publication`)
        .set(api(admin))
        .send(input),
    );
    expect(edited.platos.find((p) => p._id === firstId)).toMatchObject({
      stock: 12,
      precio: 5900,
      nombre: regular.nombre,
    });
    expect(edited.platos.find((p) => p._id === secondId)).toMatchObject({
      retirado: true,
      stock: 5,
    });
    const newId = edited.platos.find(
      (p) => p.catalogoId === String(added._id),
    )!._id;
    const [visible] = await body<SavedMenu[]>(http().get('/menu/2031-01-02'));
    expect(visible.platos).toHaveLength(2);
    expect(visible.platos.some((p) => p._id === secondId)).toBe(false);
    const recorded = await body<
      { _id: string; items: { nombre: string; precio: number }[] }[]
    >(http().get('/orders').set(api(admin)));
    expect(recorded.find((p) => p._id === order._id)!.items[0]).toMatchObject({
      nombre: regular.nombre,
      precio: 5500,
    });
    await http()
      .post('/orders')
      .set(api(customer))
      .set('Idempotency-Key', '00000000-0000-4000-8000-000000000003')
      .send({
        ...orderInput,
        items: [
          {
            platoId: secondId,
            nombre: second.nombre,
            precio: 5500,
            cantidad: 1,
          },
        ],
      })
      .expect(400);
    await dishes.updateOne({ _id: firstId }, { $inc: { stock: -1 } });
    await http()
      .patch(`/menu/${published._id}/publication`)
      .set(api(admin))
      .send({
        ...input,
        expectedUpdatedAt: edited.updatedAt,
        platos: [{ ...input.platos[0], stock: 20, expectedStock: 12 }],
      })
      .expect(409);
    expect((await dishes.findById(firstId))!.stock).toBe(11);
    const pricesOnly = {
      expectedUpdatedAt: edited.updatedAt,
      precioBase: 6500,
      platos: [
        { id: firstId, precioEspecial: 6000 },
        { id: newId, precioEspecial: null },
      ],
    };
    edited = await body<SavedMenu>(
      http()
        .patch(`/menu/${published._id}/publication`)
        .set(api(admin))
        .send(pricesOnly),
    );
    expect(edited.platos.find((p) => p._id === firstId)).toMatchObject({
      stock: 11,
      precio: 6000,
    });
    expect(edited.platos.find((p) => p._id === newId)!.precio).toBe(6500);
    await http()
      .patch(`/menu/${published._id}/publication`)
      .set(api(admin))
      .send(pricesOnly)
      .expect(409);
    await http().delete(`/dishes/${firstId}`).set(api(admin)).expect(409);
    await http().delete(`/menu/${published._id}`).set(api(admin)).expect(409);
    const removeOrdered = {
      expectedUpdatedAt: edited.updatedAt,
      precioBase: 6500,
      platos: [{ id: newId, precioEspecial: null }],
    };
    await http()
      .patch(`/menu/${published._id}/publication`)
      .set(api(admin))
      .send(removeOrdered)
      .expect(409);
    expect((await dishes.findById(firstId))!.retirado).toBe(false);
    edited = await body<SavedMenu>(
      http()
        .patch(`/menu/${published._id}/publication`)
        .set(api(admin))
        .send({
          expectedUpdatedAt: edited.updatedAt,
          precioBase: 6500,
          platos: [
            { id: firstId, stock: 0, expectedStock: 11, precioEspecial: null },
            { id: newId, precioEspecial: null },
          ],
        }),
    );
    expect(edited.platos.find((p) => p._id === firstId)).toMatchObject({
      stock: 0,
      retirado: false,
      tienePedidos: true,
    });
    const [adminMenu] = await body<SavedMenu[]>(
      http().get('/menu/admin?fecha=2031-01-02').set(api(admin)),
    );
    expect(adminMenu.platos.find((p) => p._id === firstId)!.tienePedidos).toBe(
      true,
    );
    await http()
      .patch(`/orders/${order._id}/cancel`)
      .set(api(admin))
      .expect(200);
    await http()
      .patch(`/menu/${published._id}/publication`)
      .set(api(admin))
      .send({ ...removeOrdered, expectedUpdatedAt: edited.updatedAt })
      .expect(409);
    edited = await body<SavedMenu>(
      http()
        .patch(`/menu/${published._id}/publication`)
        .set(api(admin))
        .send({
          expectedUpdatedAt: edited.updatedAt,
          precioBase: 6500,
          platos: [
            { id: firstId, stock: 3, expectedStock: 2, precioEspecial: null },
            { id: newId, precioEspecial: null },
          ],
        }),
    );
    expect(await dishes.countDocuments({ menuId: published._id })).toBe(3);
    jest.mocked(orderingHours.isOrderingOpen).mockReturnValue(false);
    await http()
      .post('/orders')
      .set(api(customer))
      .set('Idempotency-Key', requestId)
      .send(orderInput)
      .expect(201);
    await http()
      .post('/orders')
      .set(api(customer))
      .set('Idempotency-Key', '00000000-0000-4000-8000-000000000004')
      .send(orderInput)
      .expect(403);
    expect((await dishes.findById(firstId))!.stock).toBe(3);
    jest.mocked(orderingHours.isOrderingOpen).mockReturnValue(true);
  });
  it('rejects past creation, publication and copy through every admin entry point while retaining historical reads', async () => {
    jest.mocked(dates.toIsoDate).mockReturnValue('2030-11-06');
    const past = '2030-11-05';
    const composition = {
      fecha: past,
      precioBase: 5500,
      ensalada: ['Ensalada'],
      pan: 'Pan',
      postre: ['Fruta'],
      platos: [],
    };
    for (const estado of ['borrador', 'publicado']) {
      await http()
        .post('/menu/composition')
        .set(api(admin))
        .send({ ...composition, estado })
        .expect(400);
    }
    await http()
      .post('/menu')
      .set(api(admin))
      .send({
        fecha: past,
        ensalada: ['Ensalada'],
        pan: 'Pan',
        postre: ['Fruta'],
      })
      .expect(400);
    const source = await body<SavedMenu[]>(http().get('/menu/2030-11-06'));
    await http()
      .post(`/menu/${source[0]._id}/copy?fecha=${past}`)
      .set(api(admin))
      .expect(400);
    expect(await menus.countDocuments({ fecha: past })).toBe(0);
    const historical = await menus.create({
      fecha: past,
      pan: 'Pan',
      estado: 'borrador',
    });
    await http()
      .patch(`/menu/${historical._id.toString()}/composition`)
      .set(api(admin))
      .send({
        ...composition,
        estado: 'publicado',
        expectedUpdatedAt: historical.updatedAt.toISOString(),
      })
      .expect(400);
    expect((await menus.findById(historical._id))!.estado).toBe('borrador');
    const listed = await body<SavedMenu[]>(
      http().get(`/menu/admin?fecha=${past}`).set(api(admin)),
    );
    expect(listed[0]._id).toBe(historical._id.toString());
  });
});
