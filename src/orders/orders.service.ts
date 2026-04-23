import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DateTime } from 'luxon';
import { Types } from 'mongoose';
import { DishesRepository } from '../dishes/repositories/dishes.repository';
import { MenuRepository } from '../menu/repositories/menu.repository';
import { OrderStatus } from './constants/order.constants';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersRepository } from './repositories/orders.repository';
import { OrderDocument } from './schemas/order.schema';
import { OrdersSseService } from './services/orders-sse.service';
import { WhatsappService } from './services/whatsapp.service';

const SANTIAGO_TZ = 'America/Santiago';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly menuRepository: MenuRepository,
    private readonly dishesRepository: DishesRepository,
    private readonly whatsappService: WhatsappService,
    private readonly ordersSseService: OrdersSseService,
  ) {}

  async create(dto: CreateOrderDto): Promise<OrderDocument> {
    this.logger.log(
      `Procesando pedido de "${dto.cliente}" — menuId: ${dto.menuId} — ${dto.items.length} item(s)`,
    );

    // 1. Verificar que el menú existe
    const menu = await this.menuRepository.findById(dto.menuId);
    if (!menu) {
      this.logger.warn(`Menu no encontrado — id: ${dto.menuId}`);
      throw new NotFoundException(`No existe menu con id ${dto.menuId}`);
    }
    this.logger.log(`Menu verificado — id: ${dto.menuId}, fecha: ${dto.fecha}`);

    // 2. Verificar existencia y stock de cada plato antes de tocar la DB
    //    Guardamos los platos para reutilizarlos en el paso 4 (evita segundo fetch y race condition)
    const dishMap = new Map<string, { nombre: string; stock: number }>();

    for (const item of dto.items) {
      const dish = await this.dishesRepository.findById(item.platoId);

      if (!dish) {
        this.logger.warn(
          `Plato no encontrado — id: ${item.platoId} ("${item.nombre}")`,
        );
        throw new NotFoundException(
          `No existe plato con id ${item.platoId} ("${item.nombre}")`,
        );
      }

      if ((dish.stock ?? 0) < item.cantidad) {
        this.logger.warn(
          `Stock insuficiente — plato: "${dish.nombre}" (${item.platoId}), disponible: ${dish.stock}, solicitado: ${item.cantidad}`,
        );
        throw new BadRequestException(
          `Stock insuficiente para "${dish.nombre}": disponible ${dish.stock ?? 0}, solicitado ${item.cantidad}`,
        );
      }

      this.logger.log(
        `Stock OK — plato: "${dish.nombre}", disponible: ${dish.stock}, solicitado: ${item.cantidad}`,
      );
      dishMap.set(item.platoId, {
        nombre: dish.nombre,
        stock: dish.stock ?? 0,
      });
    }

    // 3. Crear el pedido en MongoDB (validadoPorAdmin: false por defecto)
    const order = await this.ordersRepository.create(dto);
    this.logger.log(
      `Pedido creado — id: ${order._id}, cliente: "${dto.cliente}"`,
    );

    // 4. Descontar stock usando los datos ya leídos (sin segundo fetch)
    for (const item of dto.items) {
      const cached = dishMap.get(item.platoId);
      if (cached) {
        const newStock = cached.stock - item.cantidad;
        await this.dishesRepository.updateStock(item.platoId, newStock);
        this.logger.log(
          `Stock actualizado — plato: "${item.nombre}" (${item.platoId}) -> ${newStock}`,
        );
      }
    }

    // 5. Notificar al admin por WhatsApp (no bloquea si falla)
    void this.whatsappService.notifyOrder(order);

    // 6. Emitir evento SSE al canal admin (aún NO va a cocina)
    this.ordersSseService.emitToAdmin(order, 'new_order');
    this.logger.log(
      `Evento SSE→admin emitido para pedido ${order._id} (pendiente de validación)`,
    );

    return order;
  }

  /**
   * El admin aprueba el pedido: setea validadoPorAdmin=true y lo envía a cocina vía SSE.
   */
  async validateByAdmin(id: string): Promise<OrderDocument> {
    this.logger.log(`Validando pedido por admin — id: ${id}`);

    const order = await this.ordersRepository.validateByAdmin(id);

    if (!order) {
      this.logger.warn(`Pedido no encontrado para validar — id: ${id}`);
      throw new NotFoundException(`No existe pedido con id ${id}`);
    }

    // Emitir al canal de cocina ahora que está aprobado
    this.ordersSseService.emitToKitchen(order, 'order_validated');
    this.logger.log(`Pedido ${id} validado por admin → emitido SSE→kitchen`);

    return order;
  }

  /**
   * Cancela un pedido y restaura el stock de cada ítem.
   * Solo se puede cancelar si el pedido está en estado pendiente o en_preparacion.
   */
  async cancelOrder(id: string): Promise<OrderDocument> {
    this.logger.log(`Cancelando pedido — id: ${id}`);

    // 1. Obtener el pedido completo para acceder a sus ítems
    const order = await this.ordersRepository.findById(id);

    if (!order) {
      this.logger.warn(`Pedido no encontrado para cancelar — id: ${id}`);
      throw new NotFoundException(`No existe pedido con id ${id}`);
    }

    // 2. Verificar que el estado permite cancelación
    const terminales: OrderStatus[] = [
      OrderStatus.CANCELADO,
      OrderStatus.ENTREGADO,
    ];
    if (terminales.includes(order.estado)) {
      this.logger.warn(
        `Cancelación rechazada — pedido ${id} ya está en estado "${order.estado}"`,
      );
      throw new BadRequestException(
        `No se puede cancelar un pedido con estado "${order.estado}"`,
      );
    }

    // 3. Restaurar stock por cada ítem
    for (const item of order.items) {
      const platoId = (item.platoId as Types.ObjectId).toString();
      const dish = await this.dishesRepository.findById(platoId);

      if (dish) {
        const newStock = (dish.stock ?? 0) + item.cantidad;
        await this.dishesRepository.updateStock(platoId, newStock);
        this.logger.log(
          `Stock restaurado — plato: "${item.nombre}" (${platoId}) ${dish.stock ?? 0} -> ${newStock}`,
        );
      } else {
        // El plato pudo haber sido eliminado; solo logueamos y continuamos
        this.logger.warn(
          `Plato no encontrado al restaurar stock — id: ${platoId} ("${item.nombre}") — se omite`,
        );
      }
    }

    // 4. Actualizar estado a cancelado en MongoDB
    const ahora = DateTime.now().setZone(SANTIAGO_TZ).toJSDate();
    this.logger.log(
      `Pedido ${id} cancelado — canceladoEn: ${DateTime.fromJSDate(ahora, { zone: SANTIAGO_TZ }).toFormat('yyyy-MM-dd HH:mm:ss')}`,
    );
    const cancelled = await this.ordersRepository.updateStatus(
      id,
      OrderStatus.CANCELADO,
      { canceladoEn: ahora },
    );

    if (!cancelled) {
      throw new NotFoundException(`No existe pedido con id ${id}`);
    }

    // 5. Notificar por SSE al canal correspondiente
    //    Si aún no había llegado a cocina → notificar al admin para que lo retire
    //    Si ya estaba validado (estaba en cocina) → notificar a cocina
    if (!cancelled.validadoPorAdmin) {
      this.ordersSseService.emitToAdmin(cancelled, 'order_cancelled');
      this.logger.log(`Pedido ${id} cancelado → SSE→admin [order_cancelled]`);
    } else {
      this.ordersSseService.emitToKitchen(cancelled, 'status_update');
      this.logger.log(`Pedido ${id} cancelado → SSE→kitchen [status_update]`);
    }

    return cancelled;
  }

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
  ): Promise<OrderDocument> {
    this.logger.log(`Actualizando estado pedido ${id} -> ${dto.estado}`);

    const ahora = DateTime.now().setZone(SANTIAGO_TZ).toJSDate();
    const timestamps: {
      aceptadoEn?: Date;
      entregadoEn?: Date;
      canceladoEn?: Date;
    } = {};

    if (dto.estado === OrderStatus.EN_PREPARACION) {
      timestamps.aceptadoEn = ahora;
      this.logger.log(
        `Pedido ${id} pasa a EN_PREPARACION — aceptadoEn: ${DateTime.fromJSDate(ahora, { zone: SANTIAGO_TZ }).toFormat('yyyy-MM-dd HH:mm:ss')}`,
      );
    } else if (dto.estado === OrderStatus.ENTREGADO) {
      timestamps.entregadoEn = ahora;
      this.logger.log(
        `Pedido ${id} pasa a ENTREGADO — entregadoEn: ${DateTime.fromJSDate(ahora, { zone: SANTIAGO_TZ }).toFormat('yyyy-MM-dd HH:mm:ss')}`,
      );
    } else if (dto.estado === OrderStatus.CANCELADO) {
      timestamps.canceladoEn = ahora;
      this.logger.log(
        `Pedido ${id} pasa a CANCELADO — canceladoEn: ${DateTime.fromJSDate(ahora, { zone: SANTIAGO_TZ }).toFormat('yyyy-MM-dd HH:mm:ss')}`,
      );
    }

    const order = await this.ordersRepository.updateStatus(
      id,
      dto.estado,
      timestamps,
    );

    if (!order) {
      this.logger.warn(
        `Pedido no encontrado para actualizar estado — id: ${id}`,
      );
      throw new NotFoundException(`No existe pedido con id ${id}`);
    }

    // Cambios de estado van al canal de cocina
    this.ordersSseService.emitToKitchen(order, 'status_update');
    this.logger.log(
      `Estado actualizado — pedido: ${id}, estado: ${dto.estado}`,
    );

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
