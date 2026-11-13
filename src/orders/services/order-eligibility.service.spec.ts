import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrderEligibilityService } from './order-eligibility.service';

describe('Order eligibility', () => {
  const service = new OrderEligibilityService();
  const today = { fecha: '2026-11-13', estado: 'publicado' };
  const open = new Date('2026-11-13T15:00:00Z');

  it('allows today at opening and just before closing', () => {
    for (const value of ['2026-11-13T11:00:00Z', '2026-11-13T18:59:59Z'])
      expect(() =>
        service.assertCanOrder(today, today.fecha, new Date(value)),
      ).not.toThrow();
  });
  it.each(['2026-11-13T10:59:59Z', '2026-11-13T19:00:00Z'])(
    'rejects a new order outside the window: %s',
    (value) => {
      expect(() =>
        service.assertCanOrder(today, today.fecha, new Date(value)),
      ).toThrow(ForbiddenException);
    },
  );
  it.each(['2026-11-12', '2026-11-14'])(
    'rejects a noncurrent menu even when its requested date matches: %s',
    (fecha) => {
      expect(() =>
        service.assertCanOrder({ ...today, fecha }, fecha, open),
      ).toThrow('Solo puedes hacer pedidos del menú de hoy.');
    },
  );
  it.each([
    null,
    { ...today, estado: 'borrador' },
    { ...today, fecha: '2026-11-12' },
  ])('rejects a missing, unpublished or mismatched menu', (menu) => {
    expect(() => service.assertCanOrder(menu, today.fecha, open)).toThrow(
      BadRequestException,
    );
  });
  it('uses Santiago winter hours and retains legacy published menus without estado', () => {
    expect(() =>
      service.assertCanOrder(
        { fecha: '2026-07-13' },
        '2026-07-13',
        new Date('2026-07-13T12:00:00Z'),
      ),
    ).not.toThrow();
    expect(() =>
      service.assertCanOrder(
        { fecha: '2026-07-13' },
        '2026-07-13',
        new Date('2026-07-13T20:00:00Z'),
      ),
    ).toThrow(ForbiddenException);
  });
});
