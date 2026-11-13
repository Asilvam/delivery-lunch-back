import { MENU_SALAD, MENU_DESSERT } from '../menu/constants/menu.constants';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { createHash } from 'node:crypto';
import { DishesRepository } from '../dishes/repositories/dishes.repository';
import { MenuRepository } from '../menu/repositories/menu.repository';
import { OrderStatus } from './constants/order.constants';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersRepository } from './repositories/orders.repository';
import { OrderDocument } from './schemas/order.schema';
import { OrdersSseService } from './services/orders-sse.service';
import { WhatsappService } from './services/whatsapp.service';
import { OrderEligibilityService } from './services/order-eligibility.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly ordersRepository: OrdersRepository,
    private readonly menuRepository: MenuRepository,
    private readonly dishesRepository: DishesRepository,
    private readonly whatsappService: WhatsappService,
    private readonly ordersSseService: OrdersSseService,
    private readonly eligibility: OrderEligibilityService,
  ) {}

  async create(
    dto: CreateOrderDto,
    customer: { googleId: string; email: string },
    requestId: string,
  ): Promise<OrderDocument> {
    const fingerprint = createHash('sha256')
      .update(
        JSON.stringify({
          menuId: dto.menuId,
          fecha: dto.fecha,
          cliente: dto.cliente,
          telefono: dto.telefono,
          items: dto.items.map((i) => ({
            platoId: i.platoId,
            cantidad: i.cantidad,
            selecciones: Object.fromEntries(
              Object.entries(i.selecciones ?? {}).sort(),
            ),
          })),
        }),
      )
      .digest('hex');
    const checkExisting = (order: OrderDocument) => {
      if (order.requestFingerprint !== fingerprint)
        throw new ConflictException(
          'Este intento corresponde a otro pedido. Revisa el pedido antes de continuar.',
        );
      return order;
    };
    await this.ordersRepository.ensureIndexes();
    let result: { order: OrderDocument; created: boolean };
    try {
      result = await this.connection.transaction(async (session) => {
        const existing = await this.ordersRepository.findByRequest(
          customer.googleId,
          requestId,
          session,
        );
        if (existing) return { order: checkExisting(existing), created: false };
        const menu = await this.menuRepository.findById(dto.menuId, session);
        this.eligibility.assertCanOrder(menu, dto.fecha);
        const quantities = new Map<string, number>();
        for (const item of dto.items)
          quantities.set(
            item.platoId,
            (quantities.get(item.platoId) ?? 0) + item.cantidad,
          );
        const dishes = new Map<
          string,
          {
            nombre: string;
            precio: number;
            es_hipo: boolean;
            opciones: string[];
          }
        >();
        for (const [id, quantity] of quantities) {
          const dish = await this.dishesRepository.reserveStock(
            id,
            dto.menuId,
            quantity,
            session,
          );
          if (!dish)
            throw new BadRequestException(
              'Uno de los platos ya no tiene stock suficiente. Revisa tu pedido.',
            );
          dishes.set(id, dish);
        }
        const items = dto.items.map((item) => {
          const dish = dishes.get(item.platoId)!;
          const protein = item.selecciones?.proteina;
          if (dish.es_hipo && (!protein || !dish.opciones.includes(protein))) {
            throw new BadRequestException(
              'Elige una proteína disponible para el menú hipocalórico',
            );
          }
          if (!Number.isSafeInteger(dish.precio) || dish.precio <= 0)
            throw new BadRequestException('El plato no tiene un precio válido');
          if (item.precio !== dish.precio)
            throw new ConflictException({
              code: 'PRICE_CHANGED',
              message:
                'El precio de un plato cambió. Revisa el total actualizado antes de enviar.',
            });
          return {
            ...item,
            nombre: dish.nombre,
            precio: dish.precio,
            selecciones: {
              ...(dish.es_hipo ? { proteina: protein! } : {}),
              ensalada: MENU_SALAD,
              postre: MENU_DESSERT,
            },
          };
        });
        const total = items.reduce(
          (sum, item) => sum + item.precio * item.cantidad,
          0,
        );
        this.eligibility.assertCanOrder(menu, dto.fecha);
        const order = await this.ordersRepository.create(
          { ...dto, items, total },
          {
            customerGoogleId: customer.googleId,
            customerEmail: customer.email,
            requestId,
            requestFingerprint: fingerprint,
          },
          session,
        );
        return { order, created: true };
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 11000
      ) {
        const existing = await this.ordersRepository.findByRequest(
          customer.googleId,
          requestId,
        );
        if (existing) return checkExisting(existing);
      }
      throw error;
    }
    if (result.created) {
      void this.whatsappService
        .notifyOrder(result.order)
        .catch(() =>
          this.logger.warn('No se pudo completar la notificación WhatsApp'),
        );
      this.ordersSseService.emitToAdmin(result.order, 'new_order');
    }
    return result.order;
  }

  /**
   * El admin aprueba el pedido: setea validadoPorAdmin=true y lo envía a cocina vía SSE.
   */
  async validateByAdmin(id: string): Promise<OrderDocument> {
    this.logger.log(`Validando pedido por admin — id: ${id}`);

    const order = await this.ordersRepository.validateByAdmin(id);

    if (!order) {
      const existing = await this.ordersRepository.findById(id);
      if (!existing)
        throw new NotFoundException(`No existe pedido con id ${id}`);
      if (
        existing.validadoPorAdmin &&
        existing.estado !== OrderStatus.CANCELADO
      )
        return existing;
      throw new BadRequestException(
        'Este pedido ya no está pendiente de aprobación',
      );
    }

    // Emitir al canal de cocina ahora que está aprobado
    this.ordersSseService.emitToKitchen(order, 'order_validated');
    this.ordersSseService.emitToAdmin(order, 'order_validated');
    this.logger.log(`Pedido ${id} validado por admin → emitido SSE→kitchen`);

    return order;
  }

  /**
   * Cancela un pedido y restaura el stock de cada ítem.
   * Solo se puede cancelar si el pedido está en estado pendiente o en_preparacion.
   */
  async cancelOrder(id: string): Promise<OrderDocument> {
    const result = await this.connection.transaction(async (session) => {
      const cancelled = await this.ordersRepository.cancelActive(id, session);
      if (!cancelled) {
        const existing = await this.ordersRepository.findById(id, session);
        if (!existing)
          throw new NotFoundException(`No existe pedido con id ${id}`);
        if (existing.estado === OrderStatus.CANCELADO)
          return { order: existing, changed: false };
        throw new BadRequestException(
          'No se puede cancelar un pedido entregado',
        );
      }
      for (const item of cancelled.items) {
        await this.dishesRepository.restoreStock(
          item.platoId.toString(),
          item.cantidad,
          session,
        );
      }
      return { order: cancelled, changed: true };
    });
    if (result.changed) {
      this.ordersSseService.emitToAdmin(result.order, 'order_cancelled');
      if (result.order.validadoPorAdmin)
        this.ordersSseService.emitToKitchen(result.order, 'status_update');
    }
    return result.order;
  }

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
  ): Promise<OrderDocument> {
    if (
      ![OrderStatus.EN_PREPARACION, OrderStatus.ENTREGADO].includes(dto.estado)
    )
      throw new BadRequestException(
        'Usa la acción de cancelación para restaurar stock',
      );
    const previous =
      dto.estado === OrderStatus.EN_PREPARACION
        ? OrderStatus.PENDIENTE
        : OrderStatus.EN_PREPARACION;
    const order = await this.ordersRepository.advanceStatus(
      id,
      previous,
      dto.estado,
    );
    if (!order) {
      const existing = await this.ordersRepository.findById(id);
      if (!existing)
        throw new NotFoundException(`No existe pedido con id ${id}`);
      if (existing.validadoPorAdmin && existing.estado === dto.estado)
        return existing;
      throw new ConflictException(
        'El pedido cambió de estado o todavía no fue aprobado. Actualiza la lista.',
      );
    }
    this.ordersSseService.emitToKitchen(order, 'status_update');
    return order;
  }

  async findById(id: string): Promise<OrderDocument> {
    this.logger.log(`Buscando pedido — id: ${id}`);
    const order = await this.ordersRepository.findById(id);

    if (!order) {
      this.logger.warn(`Pedido no encontrado — id: ${id}`);
      throw new NotFoundException(`No existe pedido con id ${id}`);
    }

    return order;
  }

  async findAllByAdminTrue(): Promise<OrderDocument[]> {
    this.logger.log(`Listando pedidos — validadoPorAdmin`);
    return this.ordersRepository.findAllByAdminTrue();
  }

  async findAll(estado?: OrderStatus): Promise<OrderDocument[]> {
    this.logger.log(
      `Listando pedidos${estado ? ` con estado: ${estado}` : ''}`,
    );
    return this.ordersRepository.findAll(estado);
  }

  async findByDate(date: string): Promise<OrderDocument[]> {
    return this.ordersRepository.findByDate(date);
  }
}
