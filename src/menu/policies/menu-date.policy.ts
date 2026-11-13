import { BadRequestException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { toIsoDate } from '../../common/utils/date.utils';

export function assertMenuDateNotPast(fecha: string, now = new Date()): void {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
    !DateTime.fromISO(fecha, { zone: 'America/Santiago' }).isValid
  )
    throw new BadRequestException('La fecha del menú no es válida.');
  if (fecha < toIsoDate(now))
    throw new BadRequestException({
      code: 'MENU_DATE_PAST',
      message: 'No puedes crear ni publicar menús con fecha pasada.',
    });
}
