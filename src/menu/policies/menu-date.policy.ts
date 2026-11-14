import { BadRequestException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { hasOrderingClosed } from '../../common/utils/ordering-hours';
import { toIsoDate } from '../../common/utils/date.utils';

export function assertCreatableMenuDate(fecha: string, now = new Date()): void {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
    !DateTime.fromISO(fecha, { zone: 'America/Santiago' }).isValid
  )
    throw new BadRequestException('La fecha del menú no es válida.');
  const today = toIsoDate(now);
  if (fecha < today)
    throw new BadRequestException({
      code: 'MENU_DATE_PAST',
      message: 'No puedes crear ni publicar menús con fecha pasada.',
    });
  if (fecha === today && hasOrderingClosed(now))
    throw new BadRequestException({
      code: 'MENU_DATE_CLOSED',
      message:
        'El horario de pedidos de hoy ya terminó. Crea el menú para mañana o una fecha posterior.',
    });
}
