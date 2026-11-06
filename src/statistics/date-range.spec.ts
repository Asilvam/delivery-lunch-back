import { statisticsDateRange } from './date-range';

describe('statisticsDateRange', () => {
  it('uses Chilean calendar days independently of the server timezone', () => {
    const range = statisticsDateRange('2026-11-06', '2026-11-06');
    expect(range.createdAt.$gte.toISOString()).toBe('2026-11-06T03:00:00.000Z');
    expect(range.createdAt.$lt.toISOString()).toBe('2026-11-07T03:00:00.000Z');
    expect(range.endDate).toBe('2026-11-06');
  });

  it('ends at midnight after a day with a daylight saving change', () => {
    const { createdAt } = statisticsDateRange('2026-09-06', '2026-09-06');
    expect(createdAt.$gte.toISOString()).toBe('2026-09-06T04:00:00.000Z');
    expect(createdAt.$lt.toISOString()).toBe('2026-09-07T03:00:00.000Z');
  });

  it('accepts dates sent by the already deployed frontend', () => {
    expect(
      statisticsDateRange('2026-11-06T00:00:00', '2026-11-06T23:59:59'),
    ).toEqual(statisticsDateRange('2026-11-06', '2026-11-06'));
  });

  it.each([
    ['2026-02-31', '2026-03-01'],
    ['not-a-date', '2026-11-06'],
    ['2026-11-07', '2026-11-06'],
  ])('rejects invalid or inverted ranges (%s, %s)', (start, end) => {
    expect(() => statisticsDateRange(start, end)).toThrow();
  });
});
