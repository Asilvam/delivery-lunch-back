import * as dates from '../common/utils/date.utils';
import { OrderEligibilityService } from './services/order-eligibility.service';
import * as orderingHours from '../common/utils/ordering-hours';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createConnection, Connection, Types } from 'mongoose';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './repositories/orders.repository';
import { DishesRepository } from '../dishes/repositories/dishes.repository';
import { Order, OrderSchema } from './schemas/order.schema';
import { Dish, DishSchema } from '../dishes/schemas/dish.schema';
import { MenuRepository } from '../menu/repositories/menu.repository';
import { WhatsappService } from './services/whatsapp.service';
import { OrdersSseService } from './services/orders-sse.service';
import { OrderStatus } from './constants/order.constants';
import { randomUUID } from 'node:crypto';
import { CreateOrderDto } from './dto/create-order.dto';

jest.setTimeout(180000);
describe('Local checkout transactions', () => {
  let mongo: MongoMemoryReplSet;
  let conn: Connection;
  let service: OrdersService;
  const menuId = new Types.ObjectId().toString();
  const dishId = new Types.ObjectId().toString();
  const customer = {
    googleId: 'test-google-user',
    email: 'customer@example.test',
  };
  const notify = jest.fn().mockResolvedValue(undefined);
  const emit = jest.fn();
  const findMenu = jest.fn();
  const payload = (): CreateOrderDto => ({
    menuId,
    fecha: '2026-11-05',
    cliente: 'Cliente',
    telefono: '+56900000000',
    total: 1,
    items: [
      {
        platoId: dishId,
        nombre: 'Nombre enviado por cliente',
        precio: 5000,
        cantidad: 1,
        selecciones: {},
      },
    ],
  });
  beforeAll(async () => {
    mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    conn = await createConnection(mongo.getUri()).asPromise();
    const orderModel = conn.model(Order.name, OrderSchema);
    const dishModel = conn.model(Dish.name, DishSchema);
    service = new OrdersService(
      conn,
      new OrdersRepository(orderModel),
      {
        findById: findMenu,
      } as unknown as MenuRepository,
      new DishesRepository(conn, orderModel, dishModel),
      { notifyOrder: notify } as unknown as WhatsappService,
      {
        emitToAdmin: emit,
        emitToKitchen: jest.fn(),
      } as unknown as OrdersSseService,
      new OrderEligibilityService(),
    );
    await orderModel.init();
  });
  beforeEach(async () => {
    jest.spyOn(orderingHours, 'isOrderingOpen').mockReturnValue(true);
    jest.spyOn(dates, 'toIsoDate').mockReturnValue('2026-11-05');
    findMenu.mockResolvedValue({ fecha: '2026-11-05', estado: 'publicado' });
    await conn.model(Order.name).deleteMany({});
    await conn.model<Dish>(Dish.name).deleteMany({});
    await conn.model<Dish>(Dish.name).create({
      _id: dishId,
      menuId,
      nombre: 'Plato real',
      precio: 5000,
      stock: 3,
    });
    notify.mockClear();
    emit.mockClear();
  });
  afterAll(async () => {
    if (conn) await conn.close();
    if (mongo) await mongo.stop();
    jest.restoreAllMocks();
  });
  it('uses the persisted dish price, records verified identity and deducts stock once', async () => {
    const key = randomUUID();
    const first = await service.create(payload(), customer, key);
    const retry = await service.create(payload(), customer, key);
    expect(first._id.toString()).toBe(retry._id.toString());
    expect(first.total).toBe(5000);
    expect(first.customerGoogleId).toBe(customer.googleId);
    expect(first.items[0].nombre).toBe('Plato real');
    expect((await conn.model<Dish>(Dish.name).findById(dishId)).stock).toBe(2);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledTimes(1);
  });
  it('rejects a stale or spoofed price without deducting stock or placing an order', async () => {
    const input = payload();
    input.items[0].precio = 1;
    await expect(
      service.create(input, customer, randomUUID()),
    ).rejects.toMatchObject({
      status: 409,
      response: { code: 'PRICE_CHANGED' },
    });
    expect((await conn.model<Dish>(Dish.name).findById(dishId)).stock).toBe(3);
    expect(await conn.model(Order.name).countDocuments()).toBe(0);
    expect(notify).not.toHaveBeenCalled();
  });
  it('handles simultaneous retries without duplicate orders', async () => {
    const key = randomUUID();
    const results = await Promise.all([
      service.create(payload(), customer, key),
      service.create(payload(), customer, key),
    ]);
    expect(results[0]._id.toString()).toBe(results[1]._id.toString());
    expect(await conn.model(Order.name).countDocuments()).toBe(1);
    expect((await conn.model<Dish>(Dish.name).findById(dishId)).stock).toBe(2);
  });
  it('rolls back earlier stock reservations when another dish is unavailable', async () => {
    const input = payload();
    input.items.push({
      ...input.items[0],
      platoId: new Types.ObjectId().toString(),
    });
    await expect(
      service.create(input, customer, randomUUID()),
    ).rejects.toMatchObject({ status: 400 });
    expect((await conn.model<Dish>(Dish.name).findById(dishId)).stock).toBe(3);
    expect(await conn.model(Order.name).countDocuments()).toBe(0);
    expect(notify).not.toHaveBeenCalled();
  });
  it('rejects reusing a key for a changed order', async () => {
    const key = randomUUID();
    await service.create(payload(), customer, key);
    const changed = payload();
    changed.items[0].cantidad = 2;
    await expect(service.create(changed, customer, key)).rejects.toMatchObject({
      status: 409,
    });
  });
  it('aggregates variants of the same dish and does not oversell', async () => {
    const input = payload();
    input.items[0].cantidad = 2;
    input.items.push({
      ...input.items[0],
      selecciones: { postre: 'otra opción' },
    });
    await expect(
      service.create(input, customer, randomUUID()),
    ).rejects.toMatchObject({ status: 400 });
    expect((await conn.model<Dish>(Dish.name).findById(dishId)).stock).toBe(3);
  });
  it('restores stock once when cancellation is retried concurrently', async () => {
    const order = await service.create(payload(), customer, randomUUID());
    await Promise.all([
      service.cancelOrder(order._id.toString()),
      service.cancelOrder(order._id.toString()),
    ]);
    expect((await conn.model<Dish>(Dish.name).findById(dishId)).stock).toBe(3);
  });
  it('requires approval and sequential preparation before delivery', async () => {
    const order = await service.create(payload(), customer, randomUUID());
    const id = order._id.toString();
    await expect(
      service.updateStatus(id, { estado: OrderStatus.EN_PREPARACION }),
    ).rejects.toMatchObject({ status: 409 });
    await service.validateByAdmin(id);
    await expect(
      service.updateStatus(id, { estado: OrderStatus.ENTREGADO }),
    ).rejects.toMatchObject({ status: 409 });
    await service.updateStatus(id, { estado: OrderStatus.EN_PREPARACION });
    await service.updateStatus(id, { estado: OrderStatus.ENTREGADO });
    await expect(service.cancelOrder(id)).rejects.toMatchObject({
      status: 400,
    });
    expect((await conn.model<Dish>(Dish.name).findById(dishId)).stock).toBe(2);
  });
  it('requires protein only for the hypocaloric menu and rolls back invalid selections', async () => {
    await conn.model<Dish>(Dish.name).findByIdAndUpdate(dishId, {
      es_hipo: true,
      opciones: ['Atún', 'Pollo asado'],
    });
    await expect(
      service.create(payload(), customer, randomUUID()),
    ).rejects.toMatchObject({ status: 400 });
    expect((await conn.model<Dish>(Dish.name).findById(dishId)).stock).toBe(3);
    const input = payload();
    input.items[0].selecciones = {
      proteina: 'Atún',
      ensalada: 'No válida',
      postre: 'No válido',
    };
    const order = await service.create(input, customer, randomUUID());
    expect(order.total).toBe(5000);
    expect(order.items[0].selecciones).toEqual({
      proteina: 'Atún',
      ensalada: 'Ensalada surtida',
      postre: 'Postre del día',
    });
  });
  it('rolls back a reservation if closing time is reached before saving the order', async () => {
    jest
      .mocked(orderingHours.isOrderingOpen)
      .mockReturnValueOnce(true)
      .mockReturnValue(false);
    await expect(
      service.create(payload(), customer, randomUUID()),
    ).rejects.toMatchObject({
      status: 403,
      response: { code: 'ORDERING_CLOSED' },
    });
    expect((await conn.model<Dish>(Dish.name).findById(dishId)).stock).toBe(3);
    expect(await conn.model(Order.name).countDocuments()).toBe(0);
    expect(notify).not.toHaveBeenCalled();
  });
  it.each([
    { fecha: '2026-11-04', estado: 'publicado' },
    { fecha: '2026-11-06', estado: 'publicado' },
    { fecha: '2026-11-05', estado: 'borrador' },
  ])('rejects ineligible menus before deducting stock: %j', async (menu) => {
    findMenu.mockResolvedValue(menu);
    await expect(
      service.create(
        { ...payload(), fecha: menu.fecha },
        customer,
        randomUUID(),
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect((await conn.model<Dish>(Dish.name).findById(dishId)).stock).toBe(3);
    expect(await conn.model(Order.name).countDocuments()).toBe(0);
    expect(notify).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });
  it('recovers a recorded attempt after its date and window expire without a second stock deduction', async () => {
    const key = randomUUID();
    const first = await service.create(payload(), customer, key);
    jest.mocked(dates.toIsoDate).mockReturnValue('2026-11-06');
    jest.mocked(orderingHours.isOrderingOpen).mockReturnValue(false);
    const recovered = await service.create(payload(), customer, key);
    expect(recovered._id.toString()).toBe(first._id.toString());
    expect(await conn.model(Order.name).countDocuments()).toBe(1);
    expect((await conn.model<Dish>(Dish.name).findById(dishId)).stock).toBe(2);
    expect(notify).toHaveBeenCalledTimes(1);
  });
  it('rolls back stock if the calendar date changes before the order is saved', async () => {
    jest
      .mocked(dates.toIsoDate)
      .mockReturnValueOnce('2026-11-05')
      .mockReturnValue('2026-11-06');
    await expect(
      service.create(payload(), customer, randomUUID()),
    ).rejects.toMatchObject({
      status: 400,
      response: { code: 'MENU_NOT_TODAY' },
    });
    expect((await conn.model<Dish>(Dish.name).findById(dishId)).stock).toBe(3);
    expect(await conn.model(Order.name).countDocuments()).toBe(0);
  });
});
