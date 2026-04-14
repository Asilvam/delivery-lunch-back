import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { OrderDocument } from '../schemas/order.schema';

export interface SseOrderEvent {
  data: string;
  type: string;
}

@Injectable()
export class OrdersSseService implements OnModuleDestroy {
  private readonly logger = new Logger(OrdersSseService.name);

  /** Canal para el panel de administración (pedidos nuevos pendientes de aprobación) */
  private readonly adminSubject = new Subject<SseOrderEvent>();

  /** Canal para el panel de cocina (pedidos aprobados + cambios de estado) */
  private readonly kitchenSubject = new Subject<SseOrderEvent>();

  /** Emite un evento al canal de administración */
  emitToAdmin(
    order: OrderDocument,
    eventType: 'new_order' | 'order_cancelled',
  ): void {
    this.logger.log(
      `SSE→admin [${eventType}] — pedido: ${order._id}, cliente: "${order.cliente}"`,
    );
    this.adminSubject.next({
      type: eventType,
      data: JSON.stringify(order.toObject()),
    });
  }

  /** Emite un evento al canal de cocina */
  emitToKitchen(
    order: OrderDocument,
    eventType: 'order_validated' | 'status_update',
  ): void {
    this.logger.log(
      `SSE→kitchen [${eventType}] — pedido: ${order._id}, cliente: "${order.cliente}"`,
    );
    this.kitchenSubject.next({
      type: eventType,
      data: JSON.stringify(order.toObject()),
    });
  }

  /** Observable expuesto al stream SSE del panel admin */
  getAdminStream(): Observable<SseOrderEvent> {
    return this.adminSubject.asObservable();
  }

  /** Observable expuesto al stream SSE del panel de cocina */
  getKitchenStream(): Observable<SseOrderEvent> {
    return this.kitchenSubject.asObservable();
  }

  onModuleDestroy(): void {
    this.logger.log('Cerrando streams SSE — módulo destruido');
    this.adminSubject.complete();
    this.kitchenSubject.complete();
  }
}
