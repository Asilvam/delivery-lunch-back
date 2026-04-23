import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { OrderStatus } from '../orders/constants/order.constants';
import {
  DashboardSummaryDto,
  TopDishDto,
  PeakHourDto,
  RevenueByDayDto,
  CancellationStatsDto,
} from './dto/dashboard-summary.dto';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

interface RevenueAggregateResult {
  _id: string;
  total: number;
  pedidosCount: number;
}

interface DashboardAggregateResult {
  totalPedidos: number;
  ingresosTotales: number;
  completados: number;
  cancelados: number;
}

interface TopDishAggregateResult {
  _id: {
    platoId: Types.ObjectId | string;
    nombre: string;
  };
  cantidadVendida: number;
  ingresosTotales: number;
}

interface PeakHourAggregateResult {
  _id: {
    dayOfWeek: number;
    hour: number;
  };
  count: number;
}

interface CancellationAggregateResult {
  _id: string;
  count: number;
}

@Injectable()
export class StatisticsService {
  /**
   * Limpia el cache de estadísticas en memoria (usado tras seed/reset de datos)
   */
  public clearCache(): void {
    this.logger.warn(
      'Limpiando todos los datos de cache de estadísticas (reset manual)',
    );
    this.cache.clear();
  }

  private readonly logger = new Logger(StatisticsService.name);
  private readonly cache = new Map<string, CacheEntry<unknown>>();

  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  private getCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached || Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return cached.data as T;
  }

  private setCache<T>(key: string, data: T, ttlMinutes: number) {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMinutes * 60000,
    });
    this.logger.debug(`Cache set: ${key} (TTL: ${ttlMinutes}min)`);
  }

  private parseDate(dateStr: string): Date {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return new Date();
    }
    return date;
  }

  async getDashboardSummary(
    startDate: string,
    endDate: string,
  ): Promise<DashboardSummaryDto> {
    const cacheKey = `summary:${startDate}:${endDate}`;
    const cached = this.getCache<DashboardSummaryDto>(cacheKey);
    if (cached) return cached;

    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);
    end.setHours(23, 59, 59, 999);

    const pipeline: PipelineStage[] = [
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          estado: { $in: [OrderStatus.ENTREGADO, OrderStatus.CANCELADO] },
        },
      },
      {
        $group: {
          _id: null,
          totalPedidos: { $sum: 1 },
          ingresosTotales: {
            $sum: {
              $cond: [{ $eq: ['$estado', OrderStatus.ENTREGADO] }, '$total', 0],
            },
          },
          completados: {
            $sum: {
              $cond: [{ $eq: ['$estado', OrderStatus.ENTREGADO] }, 1, 0],
            },
          },
          cancelados: {
            $sum: {
              $cond: [{ $eq: ['$estado', OrderStatus.CANCELADO] }, 1, 0],
            },
          },
        },
      },
    ];

    const result = await this.orderModel
      .aggregate<DashboardAggregateResult>(pipeline)
      .exec();
    const stats: DashboardAggregateResult = result[0] || {
      totalPedidos: 0,
      ingresosTotales: 0,
      completados: 0,
      cancelados: 0,
    };

    const tasaCompletacion =
      stats.totalPedidos > 0
        ? (stats.completados / stats.totalPedidos) * 100
        : 0;
    const ticketPromedio =
      stats.totalPedidos > 0 ? stats.ingresosTotales / stats.totalPedidos : 0;

    const summary: DashboardSummaryDto = {
      pedidosTotales: stats.totalPedidos,
      pedidosCompletados: stats.completados,
      pedidosCancelados: stats.cancelados,
      tasaCompletacion: Math.round(tasaCompletacion * 100) / 100,
      ingresosTotales: Math.round(stats.ingresosTotales),
      ticketPromedio: Math.round(ticketPromedio),
      periodo: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      },
    };

    this.setCache(cacheKey, summary, 1);
    return summary;
  }

  async getTopDishes(
    startDate: string,
    endDate: string,
    limit = 10,
  ): Promise<TopDishDto[]> {
    const cacheKey = `topDishes:${startDate}:${endDate}:${limit}`;
    const cached = this.getCache<TopDishDto[]>(cacheKey);
    if (cached) return cached;

    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);
    end.setHours(23, 59, 59, 999);

    const pipeline: PipelineStage[] = [
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          estado: {
            $in: [OrderStatus.ENTREGADO],
          },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            platoId: '$items.platoId',
            nombre: '$items.nombre',
          },
          cantidadVendida: { $sum: '$items.cantidad' },
          ingresosTotales: {
            $sum: { $multiply: ['$items.precio', '$items.cantidad'] },
          },
        },
      },
      { $sort: { cantidadVendida: -1 as const } },
      { $limit: limit },
    ];

    const results = await this.orderModel
      .aggregate<TopDishAggregateResult>(pipeline)
      .exec();

    const totalVentas = results.reduce((sum, r) => sum + r.cantidadVendida, 0);

    const topDishes: TopDishDto[] = results.map((r) => ({
      platoId: String(r._id.platoId),
      nombre: r._id.nombre,
      cantidadVendida: r.cantidadVendida,
      ingresosTotales: Math.round(r.ingresosTotales),
      porcentajeVentas:
        totalVentas > 0
          ? Math.round((r.cantidadVendida / totalVentas) * 10000) / 100
          : 0,
    }));

    this.setCache(cacheKey, topDishes, 15);
    return topDishes;
  }

  async getPeakHours(
    startDate: string,
    endDate: string,
  ): Promise<PeakHourDto[]> {
    const cacheKey = `peakHours:${startDate}:${endDate}`;
    const cached = this.getCache<PeakHourDto[]>(cacheKey);
    if (cached) return cached;

    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);
    end.setHours(23, 59, 59, 999);

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    const pipeline: PipelineStage[] = [
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            dayOfWeek: { $dayOfWeek: '$createdAt' },
            hour: { $hour: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 as const } },
    ];

    const results = await this.orderModel
      .aggregate<PeakHourAggregateResult>(pipeline)
      .exec();

    const peakHours: PeakHourDto[] = results.map((r) => ({
      dayOfWeek: r._id.dayOfWeek,
      dayName: dayNames[r._id.dayOfWeek - 1] || 'Desconocido',
      hour: r._id.hour,
      hourLabel: `${String(r._id.hour).padStart(2, '0')}:00`,
      count: r.count,
    }));

    this.setCache(cacheKey, peakHours, 60);
    return peakHours;
  }

  async getRevenueByDay(
    startDate: string,
    endDate: string,
  ): Promise<RevenueByDayDto[]> {
    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);
    end.setHours(23, 59, 59, 999);

    const pipeline: PipelineStage[] = [
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          estado: { $in: [OrderStatus.ENTREGADO] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: '$total' },
          pedidosCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 as const } },
    ];

    const results = await this.orderModel
      .aggregate<RevenueAggregateResult>(pipeline)
      .exec();

    return results.map((r) => ({
      date: r._id,
      total: Math.round(r.total),
      pedidosCount: r.pedidosCount,
    }));
  }

  async getCancellationStats(
    startDate: string,
    endDate: string,
  ): Promise<CancellationStatsDto[]> {
    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);
    end.setHours(23, 59, 59, 999);

    const pipeline: PipelineStage[] = [
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          estado: { $in: [OrderStatus.CANCELADO, OrderStatus.ENTREGADO] },
        },
      },
      {
        $group: {
          _id: '$estado',
          count: { $sum: 1 },
        },
      },
    ];

    const results = await this.orderModel
      .aggregate<CancellationAggregateResult>(pipeline)
      .exec();
    const total = results.reduce((sum, r) => sum + r.count, 0);

    return results.map((r) => ({
      estado: r._id,
      count: r.count,
      porcentaje: total > 0 ? Math.round((r.count / total) * 10000) / 100 : 0,
    }));
  }
}
