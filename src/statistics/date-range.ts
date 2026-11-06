import { BadRequestException } from '@nestjs/common';
import { DateTime } from 'luxon';

export const STATISTICS_TIME_ZONE = 'America/Santiago';

export function statisticsDateRange(startDate?: string, endDate?: string) {
  const today = DateTime.now().setZone(STATISTICS_TIME_ZONE).toISODate()!;
  // Accept the legacy timestamps sent by older clients as well as date-only values.
  const start = DateTime.fromISO(startDate || today, {
    zone: STATISTICS_TIME_ZONE,
  }).startOf('day');
  const end = DateTime.fromISO(endDate || startDate || today, {
    zone: STATISTICS_TIME_ZONE,
  }).startOf('day');
  if (!start.isValid || !end.isValid || start > end) {
    throw new BadRequestException(
      'Indica un rango de fechas válido: Desde no puede ser posterior a Hasta.',
    );
  }
  return {
    startDate: start.toISODate(),
    endDate: end.toISODate(),
    // An exclusive next-day boundary also works across daylight saving changes.
    createdAt: {
      $gte: start.toJSDate(),
      $lt: end.plus({ days: 1 }).startOf('day').toJSDate(),
    },
  };
}
