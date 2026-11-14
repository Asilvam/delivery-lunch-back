import {
  Controller,
  Get,
  INestApplication,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { Model, Types } from 'mongoose';
import request, { Response as TestResponse } from 'supertest';
import type { Server } from 'node:http';
import { OAuth2Client } from 'google-auth-library';
import { AuthModule } from './auth.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CustomerAdminModule } from '../customers/customer-admin.module';
import { Customer, CustomerDocument } from '../customers/customer.schema';
import {
  CustomerSessionRecord,
  CustomerSessionDocument,
} from './customer-session.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
@Controller('session-test')
class ProtectedCustomerController {
  @Get() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('customer') get() {
    return { allowed: true };
  }
}
interface LoginBody {
  access_token: string;
  customer: { googleId: string; name: string; email: string };
  refreshToken?: string;
}
const cookie = (response: TestResponse) =>
  (response.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
jest.setTimeout(180000);
describe('Remembered customer sessions and administration (isolated database)', () => {
  let app: INestApplication,
    mongo: MongoMemoryReplSet,
    customers: Model<CustomerDocument>,
    sessions: Model<CustomerSessionDocument>,
    orders: Model<OrderDocument>;
  let admin: string, kitchen: string;
  let verifyGoogle: jest.SpyInstance;
  const origin = 'https://sabores.serviciosasm.cl';
  const http = () => request(app.getHttpServer() as Server);
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const post = (path: string) =>
    http()
      .post(`/auth/${path}`)
      .set('Origin', origin)
      .set('X-Customer-Request', '1');
  const login = () =>
    post('google').send({ credential: 'test-google' }).expect(200);
  beforeAll(async () => {
    mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              JWT_SECRET: 'local-customer-test-only',
              GOOGLE_CLIENT_ID: 'test-client',
              NODE_ENV: 'production',
              CUSTOMER_WEB_ORIGINS: origin,
            }),
          ],
        }),
        MongooseModule.forRoot(mongo.getUri()),
        AuthModule,
        CustomerAdminModule,
      ],
      controllers: [ProtectedCustomerController],
    }).compile();
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
    customers = app.get(getModelToken(Customer.name));
    sessions = app.get(getModelToken(CustomerSessionRecord.name));
    orders = app.get(getModelToken(Order.name));
    await Promise.all([customers.init(), sessions.init(), orders.init()]);
    const jwt = app.get(JwtService);
    admin = jwt.sign({ sub: 'admin', role: 'admin' });
    kitchen = jwt.sign({ sub: 'cocina', role: 'kitchen' });
  });
  beforeEach(async () => {
    await Promise.all([
      customers.deleteMany({}),
      sessions.deleteMany({}),
      orders.deleteMany({}),
    ]);
    verifyGoogle = jest
      .spyOn(OAuth2Client.prototype, 'verifyIdToken')
      .mockResolvedValue({
        getPayload: () => ({
          sub: 'google-user',
          name: 'Cliente',
          email: 'customer@example.test',
          email_verified: true,
        }),
      } as never);
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    if (app) await app.close();
    if (mongo) await mongo.stop();
  });
  it('sets a first-party HttpOnly cookie, stores only its hash and issues a 15-minute customer token', async () => {
    const response = await login();
    const body = response.body as LoginBody;
    const header = (response.headers['set-cookie'] as unknown as string[])[0];
    expect(header).toContain('HttpOnly');
    expect(header).toContain('Secure');
    expect(header).toContain('SameSite=Lax');
    expect(header).toContain('Path=/api/auth');
    expect(header).toContain('Max-Age=2592000');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(body.refreshToken).toBeUndefined();
    const claims = app
      .get(JwtService)
      .verify<{ exp: number; iat: number; role: string }>(body.access_token);
    expect(claims.exp - claims.iat).toBe(900);
    expect(claims.role).toBe('customer');
    const stored = await sessions.findOne().lean().exec();
    expect(stored!.tokenHash).not.toBe(cookie(response).split('=')[1]);
    expect(await customers.countDocuments()).toBe(1);
    await http().get('/session-test').set(auth(body.access_token)).expect(200);
  });
  it('restores after closing a tab, rejects anonymous access and does not extend the 30-day deadline', async () => {
    const first = await login();
    const saved = await sessions.findOne().lean().exec();
    const restored = await post('refresh')
      .set('Cookie', cookie(first))
      .send({})
      .expect(200);
    expect((restored.body as LoginBody).customer.googleId).toBe('google-user');
    expect((await sessions.findOne().lean().exec())!.expiresAt).toEqual(
      saved!.expiresAt,
    );
    expect(await sessions.countDocuments()).toBe(1);
    await post('refresh').send({}).expect(204);
    await http().get('/session-test').expect(401);
    await sessions.updateMany(
      {},
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );
    await post('refresh').set('Cookie', cookie(first)).send({}).expect(401);
  });
  it('supports concurrent logins on separate devices without duplicating the customer', async () => {
    await Promise.all([login(), login()]);
    expect(await customers.countDocuments()).toBe(1);
    expect(await sessions.countDocuments()).toBe(2);
  });
  it('rejects old customer tokens that are not bound to a revocable device session', async () => {
    await login();
    const untracked = app.get(JwtService).sign({
      sub: 'google-user',
      role: 'customer',
      email: 'customer@example.test',
    });
    await http().get('/session-test').set(auth(untracked)).expect(401);
  });
  it('revokes the remembered session and its already issued access on logout', async () => {
    const first = await login();
    await post('logout').set('Cookie', cookie(first)).send({}).expect(204);
    await post('refresh').set('Cookie', cookie(first)).send({}).expect(401);
    await http()
      .get('/session-test')
      .set(auth((first.body as LoginBody).access_token))
      .expect(401);
    expect(await sessions.countDocuments()).toBe(0);
  });
  it('rejects requests from other origins and missing CSRF headers before authenticating', async () => {
    await http()
      .post('/auth/google')
      .set('Origin', 'https://untrusted.example')
      .set('X-Customer-Request', '1')
      .send({ credential: 'test' })
      .expect(403);
    await http()
      .post('/auth/google')
      .set('Origin', origin)
      .send({ credential: 'test' })
      .expect(403);
    expect(verifyGoogle.mock.calls).toHaveLength(0);
  });
  it('blocks login, refresh and existing access; unblocking requires a fresh Google login', async () => {
    const first = await login();
    const old = (first.body as LoginBody).access_token;
    await http()
      .patch('/customers/google-user/block')
      .set(auth(admin))
      .send({ blocked: true, reason: 'Prueba' })
      .expect(200);
    await post('refresh').set('Cookie', cookie(first)).send({}).expect(403);
    await http().get('/session-test').set(auth(old)).expect(403);
    await post('google').send({ credential: 'test' }).expect(403);
    await http()
      .patch('/customers/google-user/block')
      .set(auth(admin))
      .send({ blocked: false })
      .expect(200);
    await post('refresh').set('Cookie', cookie(first)).send({}).expect(401);
    await http().get('/session-test').set(auth(old)).expect(401);
    await login();
    expect(await customers.countDocuments()).toBe(1);
  });
  it('allows only admin to list and block customers, and validates its input', async () => {
    const first = await login();
    for (const token of [kitchen, (first.body as LoginBody).access_token]) {
      await http().get('/customers').set(auth(token)).expect(403);
      await http()
        .patch('/customers/google-user/block')
        .set(auth(token))
        .send({ blocked: true })
        .expect(403);
    }
    await http().get('/customers').expect(401);
    await http().get('/customers?page=-1').set(auth(admin)).expect(400);
    await http()
      .patch('/customers/google-user/block')
      .set(auth(admin))
      .send({ blocked: 'true' })
      .expect(400);
  });
  it('lists historical verified customers without duplicates and leaves old orders untouched when blocked', async () => {
    await login();
    const record = {
      menuId: new Types.ObjectId(),
      fecha: '2026-11-13',
      telefono: '+56911111111',
      total: 5500,
      items: [],
    };
    await orders.create([
      {
        ...record,
        cliente: 'Cliente',
        customerGoogleId: 'google-user',
        customerEmail: 'customer@example.test',
        validadoPorAdmin: true,
      },
      {
        ...record,
        cliente: 'Anterior',
        customerGoogleId: 'historical',
        customerEmail: 'old@example.test',
      },
      { ...record, cliente: 'Sin identidad Google' },
    ]);
    const before = await orders
      .findOne({ customerGoogleId: 'historical' })
      .lean()
      .exec();
    const result = (await http().get('/customers').set(auth(admin)).expect(200))
      .body as {
      total: number;
      items: {
        googleId: string;
        totalOrders: number;
        approvedOrders: number;
      }[];
    };
    expect(result.total).toBe(2);
    expect(
      result.items.find((row) => row.googleId === 'google-user'),
    ).toMatchObject({ totalOrders: 1, approvedOrders: 1 });
    await http()
      .patch('/customers/historical/block')
      .set(auth(admin))
      .send({ blocked: true })
      .expect(200);
    expect(
      await orders.findOne({ customerGoogleId: 'historical' }).lean().exec(),
    ).toEqual(before);
    const filtered = (
      await http()
        .get('/customers?status=blocked&q=old%40example.test')
        .set(auth(admin))
        .expect(200)
    ).body as { total: number };
    expect(filtered.total).toBe(1);
    const literalSearch = (
      await http().get('/customers?q=.*').set(auth(admin)).expect(200)
    ).body as { total: number };
    expect(literalSearch.total).toBe(0);
  });
});
