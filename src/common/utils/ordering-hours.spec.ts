import { isOrderingOpen } from './ordering-hours';
describe('Customer ordering hours in Chile', () => {
  it.each([
    ['2026-11-06T10:59:59Z', false],
    ['2026-11-06T11:00:00Z', true],
    ['2026-11-06T18:59:59Z', true],
    ['2026-11-06T19:00:00Z', false],
    ['2026-11-07T02:00:00Z', false],
    ['2026-07-06T11:59:59Z', false],
    ['2026-07-06T12:00:00Z', true],
    ['2026-07-06T20:00:00Z', false],
  ])('%s => %s independently of server timezone', (value, open) => {
    expect(isOrderingOpen(new Date(value))).toBe(open);
  });
});
