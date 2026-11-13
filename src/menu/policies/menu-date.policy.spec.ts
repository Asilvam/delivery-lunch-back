import { assertMenuDateNotPast } from './menu-date.policy';

describe('Menu creation date', () => {
  const now = new Date('2026-11-14T01:30:00Z'); // Still November 13 in Santiago.
  it.each(['2026-11-13', '2026-11-14'])(
    'allows today and future dates: %s',
    (fecha) => {
      expect(() => assertMenuDateNotPast(fecha, now)).not.toThrow();
    },
  );
  it('rejects past dates using Santiago rather than UTC', () => {
    expect(() => assertMenuDateNotPast('2026-11-12', now)).toThrow(
      'No puedes crear ni publicar menús con fecha pasada.',
    );
  });
  it.each(['2026-02-30', '2026-13-01', '2026-11-13T12:00:00Z', '2026-1-1'])(
    'rejects invalid calendar dates: %s',
    (fecha) => {
      expect(() => assertMenuDateNotPast(fecha, now)).toThrow();
    },
  );
});
