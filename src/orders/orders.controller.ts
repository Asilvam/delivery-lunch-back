import {
  Body,
  Controller,
  Get,
  Logger,
  MessageEvent,
  Param,
  Patch,
  Post,
  Query,
  Res,
  Sse,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable, concat, map } from 'rxjs';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './repositories/orders.repository';
import { SseOrderEvent, OrdersSseService } from './services/orders-sse.service';
import { OrderStatus } from './constants/order.constants';

import { ApiTags, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(
    private readonly ordersService: OrdersService,
    private readonly ordersRepository: OrdersRepository,
    private readonly ordersSseService: OrdersSseService,
  ) {}

  /**
   * POST /orders
   * Crea un nuevo pedido: valida stock, persiste, descuenta stock,
   * notifica WhatsApp al admin y emite evento SSE al canal admin.
   */
  @Post()
  @ApiBody({ type: CreateOrderDto })
  async create(@Body() createOrderDto: CreateOrderDto) {
    this.logger.log(
      `POST /orders — cliente: "${createOrderDto.cliente}", items: ${createOrderDto.items.length}`,
    );
    return this.ordersService.create(createOrderDto);
  }

  /**
   * GET /orders
   * Lista todos los pedidos Aceptados por el admin
   * Requiere JWT + rol admin.
   */
  @Get('ByAdminTrue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async findAllByAdminTrue() {
    this.logger.log(`GET /orders`);
    return this.ordersService.findAllByAdminTrue();
  }

  /**
   * GET /orders
   * Lista todos los pedidos. Acepta query param ?estado= para filtrar.
   * Requiere JWT + rol admin.
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async findAll(@Query('estado') estado?: OrderStatus) {
    this.logger.log(`GET /orders${estado ? `?estado=${estado}` : ''}`);
    return this.ordersService.findAll(estado);
  }

  /**
   * GET /orders/stream/admin  [SSE — requiere JWT + rol admin]
   * Stream SSE para el panel de administración.
   * Al conectar, replaya primero los pedidos pendientes de validación admin.
   * Emite eventos:
   *   - new_order: cuando llega un pedido nuevo (pendiente de validación)
   */
  @Sse('stream/admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  streamAdmin(@Res() res: Response): Observable<MessageEvent> {
    this.logger.log('Admin conectado al stream SSE');

    res.on('close', () => {
      this.logger.log('Admin desconectado del stream SSE');
    });

    // Replay: emitir pedidos pendientes de validación admin al conectar
    const replayFlat$: Observable<MessageEvent> = new Observable(
      (subscriber) => {
        this.ordersRepository
          .findPendingAdminValidation()
          .then((orders) => {
            for (const o of orders) {
              subscriber.next({
                type: 'new_order',
                data: JSON.stringify(o.toObject()),
              } as MessageEvent);
            }
            subscriber.complete();
          })
          .catch((err: unknown) => subscriber.error(err));
      },
    );

    const live$ = this.ordersSseService.getAdminStream().pipe(
      map(
        (event: SseOrderEvent): MessageEvent => ({
          type: event.type,
          data: event.data,
        }),
      ),
    );

    return concat(replayFlat$, live$);
  }

  /**
   * GET /orders/stream/kitchen  [SSE — requiere JWT + rol admin o kitchen]
   * Stream SSE para el panel de cocina.
   * Al conectar, replaya primero los pedidos aprobados pendientes en cocina.
   * Emite eventos:
   *   - order_validated: cuando el admin aprueba un pedido
   *   - status_update: cuando cambia el estado de un pedido
   */
  @Sse('stream/kitchen')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'kitchen')
  streamKitchen(@Res() res: Response): Observable<MessageEvent> {
    this.logger.log('Cocina conectada al stream SSE');

    res.on('close', () => {
      this.logger.log('Cocina desconectada del stream SSE');
    });

    const replayFlat$: Observable<MessageEvent> = new Observable(
      (subscriber) => {
        this.ordersRepository
          .findPendingKitchen()
          .then((orders) => {
            for (const o of orders) {
              subscriber.next({
                type: 'order_validated',
                data: JSON.stringify(o.toObject()),
              } as MessageEvent);
            }
            subscriber.complete();
          })
          .catch((err: unknown) => subscriber.error(err));
      },
    );

    const live$ = this.ordersSseService.getKitchenStream().pipe(
      map(
        (event: SseOrderEvent): MessageEvent => ({
          type: event.type,
          data: event.data,
        }),
      ),
    );

    return concat(replayFlat$, live$);
  }

  /**
   * PATCH /orders/:id/cancel  [requiere JWT + rol admin]
   * Cancela un pedido y restaura el stock de cada ítem.
   * Solo se puede cancelar si el pedido está en estado pendiente o en_preparacion.
   */
  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async cancel(@Param('id') id: string) {
    this.logger.log(`PATCH /orders/${id}/cancel`);
    return this.ordersService.cancelOrder(id);
  }

  /**
   * PATCH /orders/:id/admin-validate  [requiere JWT + rol admin]
   * El admin aprueba el pedido: setea validadoPorAdmin=true y lo envía a cocina vía SSE.
   */
  @Patch(':id/admin-validate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async adminValidate(@Param('id') id: string) {
    this.logger.log(`PATCH /orders/${id}/admin-validate`);
    return this.ordersService.validateByAdmin(id);
  }

  /**
   * PATCH /orders/:id/status  [requiere JWT + rol admin o kitchen]
   * Actualiza el estado de un pedido.
   * Estados válidos: pendiente | en_preparacion | entregado | cancelado
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'kitchen')
  @ApiBody({ type: UpdateOrderStatusDto })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    this.logger.log(
      `PATCH /orders/${id}/status — estado: "${updateOrderStatusDto.estado}"`,
    );
    return this.ordersService.updateStatus(id, updateOrderStatusDto);
  }
}
