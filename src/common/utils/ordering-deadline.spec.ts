import { orderingDeadline } from './ordering-deadline';

describe('Menu ordering deadline', () => {
  it.each([
    ['2026-11-13', '2026-11-13T19:00:00.000Z'],
    ['2026-07-13', '2026-07-13T20:00:00.000Z'],
  ])('closes %s at 16:00 in Santiago', (fecha, expected) => {
    expect(orderingDeadline(fecha)).toBe(expected);
  });
  it('rejects invalid dates instead of issuing a usable expiration', () => {
    expect(() => orderingDeadline('2026-02-30')).toThrow();
  });
});
