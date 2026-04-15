import { DateTime } from 'luxon';

const SANTIAGO_TZ = 'America/Santiago';

/**
 * Convierte un objeto Date a string "YYYY-MM-DD" en hora local de Santiago de Chile.
 * Reemplaza el uso de toISOString() que siempre devuelve UTC.
 */
export const toIsoDate = (date: Date): string => {
  return DateTime.fromJSDate(date, { zone: SANTIAGO_TZ }).toISODate()!;
};

/**
 * Suma días a una fecha manteniendo la zona horaria de Santiago.
 */
export const addDays = (date: Date, days: number): Date => {
  return DateTime.fromJSDate(date, { zone: SANTIAGO_TZ })
    .plus({ days })
    .toJSDate();
};
