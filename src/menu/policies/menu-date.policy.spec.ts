import { assertCreatableMenuDate } from './menu-date.policy';

describe('Menu creation date', () => {
  const now = new Date('2026-11-13T18:30:00Z'); // 15:30 in Santiago.
  it.each(['2026-11-13', '2026-11-14'])(
    'allows today and future dates: %s',
    (fecha) => {
      expect(() => assertCreatableMenuDate(fecha, now)).not.toThrow();
    },
  );
  it('rejects past dates using Santiago rather than UTC', () => {
    expect(() => assertCreatableMenuDate('2026-11-12', now)).toThrow(
      'No puedes crear ni publicar menús con fecha pasada.',
    );
  });
  it.each(['2026-02-30', '2026-13-01', '2026-11-13T12:00:00Z', '2026-1-1'])(
    'rejects invalid calendar dates: %s',
    (fecha) => {
      expect(() => assertCreatableMenuDate(fecha, now)).toThrow();
    },
  );
  it.each(['2026-11-13T19:00:00Z', '2026-11-14T01:30:00Z'])(
    'rejects today at and after closing: %s',
    (instant) => {
      expect(() =>
        assertCreatableMenuDate('2026-11-13', new Date(instant)),
      ).toThrow(
        'El horario de pedidos de hoy ya terminó. Crea el menú para mañana o una fecha posterior.',
      );
      expect(() =>
        assertCreatableMenuDate('2026-11-14', new Date(instant)),
      ).not.toThrow();
    },
  );
  it('allows preparing today before 08:00 and respects the winter closing time', () => {
    expect(() =>
      assertCreatableMenuDate('2026-11-13', new Date('2026-11-13T10:00:00Z')),
    ).not.toThrow();
    expect(() =>
      assertCreatableMenuDate('2026-07-13', new Date('2026-07-13T19:59:59Z')),
    ).not.toThrow();
    expect(() =>
      assertCreatableMenuDate('2026-07-13', new Date('2026-07-13T20:00:00Z')),
    ).toThrow();
  });
});
