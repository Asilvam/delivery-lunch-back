import { DateTime } from 'luxon';

export function orderingDeadline(fecha: string): string {
  const deadline = DateTime.fromISO(fecha, { zone: 'America/Santiago' })
    .set({ hour: 16, minute: 0, second: 0, millisecond: 0 })
    .toUTC()
    .toISO();
  if (!deadline) throw new Error('Fecha de menú inválida');
  return deadline;
}
