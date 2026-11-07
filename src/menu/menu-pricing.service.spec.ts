import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createConnection, Connection, Types } from 'mongoose';
import { Menu, MenuSchema } from './schemas/menu.schema';
import { Dish, DishSchema } from '../dishes/schemas/dish.schema';
import { MenuPricingService } from './menu-pricing.service';
import { MenuRepository } from './repositories/menu.repository';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { DishesRepository } from '../dishes/repositories/dishes.repository';
jest.setTimeout(180000);
describe('Menu price administration', () => {
  let mongo: MongoMemoryReplSet;
  let conn: Connection;
  let service: MenuPricingService;
  const menuId = new Types.ObjectId().toString();
  const dishId = new Types.ObjectId().toString();
  const secondId = new Types.ObjectId().toString();
  beforeAll(async () => {
    mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    conn = await createConnection(mongo.getUri()).asPromise();
    conn.model(Order.name, OrderSchema);
    const menus = conn.model(Menu.name, MenuSchema);
    const dishes = conn.model(Dish.name, DishSchema);
    service = new MenuPricingService(conn, menus, dishes);
  });
  beforeEach(async () => {
    await conn.model(Menu.name).deleteMany({});
    await conn.model(Dish.name).deleteMany({});
    await conn.model(Menu.name).create({
      _id: menuId,
      fecha: '2026-11-05',
      pan: 'Pan fresco',
      precioBase: 5500,
    });
    await conn.model(Dish.name).create([
      { _id: dishId, menuId, nombre: 'Pollo', precio: 5500, stock: 7 },
      { _id: secondId, menuId, nombre: 'Hipo', precio: 5500, stock: 2 },
    ]);
  });
  afterAll(async () => {
    if (conn) await conn.close();
    if (mongo) await mongo.stop();
  });
  const input = () => ({
    precioBase: 6500,
    platos: [
      { id: dishId, precio: 6500 },
      { id: secondId, precio: 7000 },
    ],
  });
  it('saves general and special prices atomically without modifying stock', async () => {
    const current = await conn.model(Menu.name).findById(menuId);
    const result = await service.update(menuId, {
      ...input(),
      expectedUpdatedAt: current.updatedAt.toISOString(),
    });
    expect(result.precioBase).toBe(6500);
    expect(result.platos.map((dish) => dish.precio).sort()).toEqual([
      6500, 7000,
    ]);
    expect((await conn.model(Dish.name).findById(dishId)).stock).toBe(7);
    const read = await new MenuRepository(
      conn,
      conn.model(Menu.name),
      conn.model(Order.name),
      new DishesRepository(conn, conn.model(Order.name), conn.model(Dish.name)),
    ).findByDate('2026-11-05');
    expect(read?.precioBase).toBe(6500);
    expect(read?.platos.map((dish) => dish.precio).sort()).toEqual([
      6500, 7000,
    ]);
  });
  it('rejects stale administration changes and preserves existing prices', async () => {
    await expect(
      service.update(menuId, {
        ...input(),
        expectedUpdatedAt: '2000-01-01T00:00:00.000Z',
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect((await conn.model(Menu.name).findById(menuId)).precioBase).toBe(
      5500,
    );
    expect((await conn.model(Dish.name).findById(dishId)).precio).toBe(5500);
  });
  it('rejects foreign or incomplete dish lists without partially applying the general price', async () => {
    await expect(
      service.update(menuId, {
        precioBase: 6500,
        platos: [
          { id: dishId, precio: 6500 },
          { id: new Types.ObjectId().toString(), precio: 7000 },
        ],
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect((await conn.model(Menu.name).findById(menuId)).precioBase).toBe(
      5500,
    );
    expect((await conn.model(Dish.name).findById(dishId)).precio).toBe(5500);
  });
});
