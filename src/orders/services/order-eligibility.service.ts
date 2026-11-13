import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { toIsoDate } from '../../common/utils/date.utils';
import { isOrderingOpen } from '../../common/utils/ordering-hours';

@Injectable()
export class OrderEligibilityService {
  assertCanOrder(
    menu: { fecha: string; estado?: string } | null,
    requestedDate: string,
    now = new Date(),
  ): void {
    if (!isOrderingOpen(now))
      throw new ForbiddenException({
        code: 'ORDERING_CLOSED',
        message: 'Los pedidos están disponibles de 08:00 a 16:00.',
      });
    // Older published menus can predate the estado field.
    if (
      !menu ||
      (menu.estado != null && menu.estado !== 'publicado') ||
      menu.fecha !== requestedDate
    )
      throw new BadRequestException({
        code: 'MENU_UNAVAILABLE',
        message: 'El menú ya no está disponible para esa fecha.',
      });
    if (menu.fecha !== toIsoDate(now))
      throw new BadRequestException({
        code: 'MENU_NOT_TODAY',
        message:
          'Solo puedes hacer pedidos del menú de hoy. Revisa el menú vigente.',
      });
  }
}
