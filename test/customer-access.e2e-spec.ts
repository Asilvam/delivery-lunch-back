import { CustomersService } from '../src/customers/customers.service';
import { CustomerSessionService } from '../src/auth/customer-session.service';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { OrdersController } from '../src/orders/orders.controller';
import { OrdersService } from '../src/orders/orders.service';
import { OrdersRepository } from '../src/orders/repositories/orders.repository';
import { OrdersSseService } from '../src/orders/services/orders-sse.service';

describe('Customer route protection', () => {
  let app: INestApplication<Server>;
  let jwt: JwtService;
  const create = jest.fn().mockResolvedValue({ _id: 'test-order' });
  const registerPayment = jest.fn().mockResolvedValue({ pagado: true });
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
        { provide: OrdersService, useValue: { create, registerPayment } },
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
  it('allows only admin to record a full payment and rejects amounts or unknown methods', async () => {
    const path = '/orders/000000000000000000000001/payment';
    await request(app.getHttpServer())
      .patch(path)
      .send({ medioPago: 'efectivo' })
      .expect(401);
    for (const role of ['customer', 'kitchen'])
      await request(app.getHttpServer())
        .patch(path)
        .set(
          'Authorization',
          `Bearer ${jwt.sign({ sub: role, role, sid: '000000000000000000000003' })}`,
        )
        .send({ medioPago: 'efectivo' })
        .expect(403);
    const admin = `Bearer ${jwt.sign({ sub: 'admin', role: 'admin' })}`;
    await request(app.getHttpServer())
      .patch(path)
      .set('Authorization', admin)
      .send({ medioPago: 'tarjeta' })
      .expect(400);
    await request(app.getHttpServer())
      .patch(path)
      .set('Authorization', admin)
      .send({ medioPago: 'efectivo', monto: 1000 })
      .expect(400);
    await request(app.getHttpServer())
      .patch(path)
      .set('Authorization', admin)
      .send({ medioPago: 'transferencia' })
      .expect(200);
    expect(registerPayment).toHaveBeenCalledWith(
      '000000000000000000000001',
      'transferencia',
    );
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
  it('allows only administrators to create manual orders, with idempotency and the normal order validation', async () => {
    const path = '/orders/manual';
    const key = randomUUID();
    await request(app.getHttpServer()).post(path).send(input).expect(401);
    for (const role of ['customer', 'kitchen'])
      await request(app.getHttpServer())
        .post(path)
        .set(
          'Authorization',
          `Bearer ${jwt.sign({ sub: role, role, sid: '000000000000000000000003' })}`,
        )
        .set('Idempotency-Key', key)
        .send(input)
        .expect(403);
    const admin = `Bearer ${jwt.sign({ sub: 'admin', role: 'admin' })}`;
    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', admin)
      .send(input)
      .expect(400);
    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', admin)
      .set('Idempotency-Key', key)
      .send({ ...input, pagado: true })
      .expect(400);
    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', admin)
      .set('Idempotency-Key', key)
      .send(input)
      .expect(201);
    expect(create).toHaveBeenCalledWith(input, { admin: 'admin' }, key);
  });
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
