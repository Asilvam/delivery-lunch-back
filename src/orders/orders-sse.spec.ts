import { Subject } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
import type { Response } from 'express';
import { OrdersController } from './orders.controller';
import { OrdersRepository } from './repositories/orders.repository';
import { OrdersService } from './orders.service';
import { OrdersSseService, SseOrderEvent } from './services/orders-sse.service';

it('marks the kitchen replay as complete before forwarding live approvals', async () => {
  const live = new Subject<SseOrderEvent>();
  const oldOrder = { _id: 'old', validadoPorAdmin: true };
  const controller = new OrdersController(
    {} as OrdersService,
    {
      findPendingKitchen: jest
        .fn()
        .mockResolvedValue([{ toObject: () => oldOrder }]),
    } as unknown as OrdersRepository,
    { getKitchenStream: () => live.asObservable() } as OrdersSseService,
  );
  const events: MessageEvent[] = [];
  const sub = controller
    .streamKitchen({ on: jest.fn() } as unknown as Response)
    .subscribe((event) => events.push(event));
  await new Promise<void>((resolve) => setImmediate(resolve));
  expect(events.map((event) => event.type)).toEqual([
    'order_validated',
    'kitchen_snapshot_complete',
  ]);
  expect(JSON.parse(events[0].data as string)).toEqual(oldOrder);
  live.next({ type: 'order_validated', data: JSON.stringify({ _id: 'new' }) });
  expect(events.map((event) => event.type)).toEqual([
    'order_validated',
    'kitchen_snapshot_complete',
    'order_validated',
  ]);
  sub.unsubscribe();
  live.complete();
});
