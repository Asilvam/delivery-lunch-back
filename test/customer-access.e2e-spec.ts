import { CustomersService } from '../src/customers/customers.service';
import { CustomerSessionService } from '../src/auth/customer-session.service';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { OrdersController } from '../src/orders/orders.controller';
import { OrdersService } from '../src/orders/orders.service';
import { OrdersRepository } from '../src/orders/repositories/orders.repository';
import { OrdersSseService } from '../src/orders/services/orders-sse.service';

describe('Customer route protection', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const create = jest.fn().mockResolvedValue({ _id: 'test-order' });
  const input = {
    menuId: '000000000000000000000001',
    fecha: '2026-11-05',
    cliente: 'Cliente',
    telefono: '+56900000000',
    total: 5000,
    items: [
      {
        platoId: '000000000000000000000002',
        nombre: 'Plato',
        cantidad: 1,
        precio: 5000,
      },
    ],
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({ secret: 'test-secret' })],
      controllers: [OrdersController],
      providers: [
        JwtStrategy,
        {
          provide: CustomersService,
          useValue: { active: jest.fn().mockResolvedValue({}) },
        },
        {
          provide: CustomerSessionService,
          useValue: { validateAccess: jest.fn().mockResolvedValue(undefined) },
        },
        JwtAuthGuard,
        RolesGuard,
        {
          provide: ConfigService,
          useValue: new ConfigService({ JWT_SECRET: 'test-secret' }),
        },
        { provide: OrdersService, useValue: { create } },
        { provide: OrdersRepository, useValue: {} },
        { provide: OrdersSseService, useValue: {} },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    jwt = module.get(JwtService);
  });
  afterAll(async () => {
    if (app) await app.close();
  });
  it('rejects anonymous requests', () =>
    request(app.getHttpServer()).post('/orders').send(input).expect(401));
  it('rejects staff JWTs for customer checkout', () =>
    request(app.getHttpServer())
      .post('/orders')
      .set(
        'Authorization',
        `Bearer ${jwt.sign({ sub: 'admin', role: 'admin' })}`,
      )
      .send(input)
      .expect(403));
  it('rejects expired sessions', () =>
    request(app.getHttpServer())
      .post('/orders')
      .set(
        'Authorization',
        `Bearer ${jwt.sign({ sub: 'google-user', role: 'customer', sid: '000000000000000000000003' }, { expiresIn: -1 })}`,
      )
      .send(input)
      .expect(401));
  it('requires a valid retry key', () =>
    request(app.getHttpServer())
      .post('/orders')
      .set(
        'Authorization',
        `Bearer ${jwt.sign({ sub: 'google-user', role: 'customer', sid: '000000000000000000000003', email: 'c@example.test' })}`,
      )
      .send(input)
      .expect(400));
  it('takes identity from the verified JWT', async () => {
    const key = randomUUID();
    await request(app.getHttpServer())
      .post('/orders')
      .set(
        'Authorization',
        `Bearer ${jwt.sign({ sub: 'google-user', role: 'customer', sid: '000000000000000000000003', email: 'c@example.test' })}`,
      )
      .set('Idempotency-Key', key)
      .send(input)
      .expect(201);
    expect(create).toHaveBeenCalledWith(
      input,
      { googleId: 'google-user', email: 'c@example.test', authVersion: 0 },
      key,
    );
  });
  it('rejects identity injected in the body', () =>
    request(app.getHttpServer())
      .post('/orders')
      .set(
        'Authorization',
        `Bearer ${jwt.sign({ sub: 'google-user', role: 'customer', sid: '000000000000000000000003' })}`,
      )
      .set('Idempotency-Key', randomUUID())
      .send({ ...input, customerGoogleId: 'someone-else' })
      .expect(400));
});
