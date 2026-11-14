import { MenuCompositionService } from '../src/menu/menu-composition.service';
import { MenuPublicationService } from '../src/menu/menu-publication.service';
import { CustomersService } from '../src/customers/customers.service';
import { CustomerSessionService } from '../src/auth/customer-session.service';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { MenuController } from '../src/menu/menu.controller';
import { MenuService } from '../src/menu/menu.service';
import { MenuPricingService } from '../src/menu/menu-pricing.service';

describe('Menu pricing route protection', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const update = jest.fn().mockResolvedValue({ precioBase: 6500 });
  const id = '000000000000000000000001';
  const input = {
    precioBase: 6500,
    platos: [{ id: '000000000000000000000002', precio: 6500 }],
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({ secret: 'test-secret' })],
      controllers: [MenuController],
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
        { provide: MenuService, useValue: {} },
        { provide: MenuCompositionService, useValue: {} },
        { provide: MenuPublicationService, useValue: {} },
        { provide: MenuPricingService, useValue: { update } },
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
  const patch = (role: string) =>
    request(app.getHttpServer())
      .patch(`/menu/${id}/prices`)
      .set(
        'Authorization',
        `Bearer ${jwt.sign({ sub: role, role, sid: '000000000000000000000003' })}`,
      );
  it('rejects anonymous access', () =>
    request(app.getHttpServer())
      .patch(`/menu/${id}/prices`)
      .send(input)
      .expect(401));
  it.each(['customer', 'kitchen'])('rejects %s price changes', (role) =>
    patch(role).send(input).expect(403),
  );
  it('allows administrators to change prices', async () => {
    await patch('admin').send(input).expect(200);
    expect(update).toHaveBeenCalledWith(id, input);
  });
  it.each([0, -10, 5500.5])('rejects invalid general price %s', (price) =>
    patch('admin')
      .send({ ...input, precioBase: price })
      .expect(400),
  );
  it('validates nested dish prices', () =>
    patch('admin')
      .send({ ...input, platos: [{ ...input.platos[0], precio: 0 }] })
      .expect(400));
  it('rejects duplicate dish ids', () =>
    patch('admin')
      .send({ ...input, platos: [input.platos[0], input.platos[0]] })
      .expect(400));
});
