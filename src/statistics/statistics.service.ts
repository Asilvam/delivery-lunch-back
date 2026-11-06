import { Injectable } from '@nestjs/common';
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
import { statisticsDateRange, STATISTICS_TIME_ZONE } from './date-range';

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
  pendientes: number;
  enPreparacion: number;
  menusVendidos: number;
}

interface TopDishAggregateResult {
  _id: string;
  platoId: Types.ObjectId | string;
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
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  async getDashboardSummary(
    startDate: string,
    endDate: string,
  ): Promise<DashboardSummaryDto> {
    const range = statisticsDateRange(startDate, endDate);

    const pipeline: PipelineStage[] = [
      {
        $match: {
          createdAt: range.createdAt,
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
          pendientes: {
            $sum: {
              $cond: [{ $eq: ['$estado', OrderStatus.PENDIENTE] }, 1, 0],
            },
          },
          enPreparacion: {
            $sum: {
              $cond: [{ $eq: ['$estado', OrderStatus.EN_PREPARACION] }, 1, 0],
            },
          },
          menusVendidos: {
            $sum: {
              $cond: [
                { $eq: ['$estado', OrderStatus.ENTREGADO] },
                { $sum: '$items.cantidad' },
                0,
              ],
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
      pendientes: 0,
      enPreparacion: 0,
      menusVendidos: 0,
    };

    const tasaCompletacion =
      stats.totalPedidos > 0
        ? (stats.completados / stats.totalPedidos) * 100
        : 0;
    const ticketPromedio =
      stats.completados > 0 ? stats.ingresosTotales / stats.completados : 0;

    const summary: DashboardSummaryDto = {
      pedidosTotales: stats.totalPedidos,
      pedidosCompletados: stats.completados,
      pedidosCancelados: stats.cancelados,
      pedidosPendientes: stats.pendientes,
      pedidosEnPreparacion: stats.enPreparacion,
      menusVendidos: stats.menusVendidos,
      tasaCompletacion: Math.round(tasaCompletacion * 100) / 100,
      ingresosTotales: Math.round(stats.ingresosTotales),
      ticketPromedio: Math.round(ticketPromedio),
      periodo: {
        startDate: range.startDate,
        endDate: range.endDate,
      },
    };

    return summary;
  }

  async getTopDishes(
    startDate: string,
    endDate: string,
    limit = 10,
  ): Promise<TopDishDto[]> {
    const range = statisticsDateRange(startDate, endDate);
    limit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 10;

    const pipeline: PipelineStage[] = [
      {
        $match: {
          createdAt: range.createdAt,
          estado: {
            $in: [OrderStatus.ENTREGADO],
          },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          // Dish IDs change when a daily menu is copied. Group the catalog name
          // before selecting the ranking so one dish cannot occupy several places.
          _id: '$items.nombre',
          platoId: { $first: '$items.platoId' },
          cantidadVendida: { $sum: '$items.cantidad' },
          ingresosTotales: {
            $sum: { $multiply: ['$items.precio', '$items.cantidad'] },
          },
        },
      },
      {
        $facet: {
          dishes: [
            { $sort: { cantidadVendida: -1, _id: 1 } },
            { $limit: limit },
          ],
          totals: [
            { $group: { _id: null, cantidad: { $sum: '$cantidadVendida' } } },
          ],
        },
      },
    ];

    const [result] = await this.orderModel
      .aggregate<{
        dishes: TopDishAggregateResult[];
        totals: { cantidad: number }[];
      }>(pipeline)
      .exec();
    const results = result?.dishes ?? [];
    const totalVentas = result?.totals[0]?.cantidad ?? 0;

    const topDishes: TopDishDto[] = results.map((r) => ({
      platoId: String(r.platoId),
      nombre: r._id,
      cantidadVendida: r.cantidadVendida,
      ingresosTotales: Math.round(r.ingresosTotales),
      porcentajeVentas:
        totalVentas > 0
          ? Math.round((r.cantidadVendida / totalVentas) * 10000) / 100
          : 0,
    }));

    return topDishes;
  }

  async getPeakHours(
    startDate: string,
    endDate: string,
  ): Promise<PeakHourDto[]> {
    const range = statisticsDateRange(startDate, endDate);

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    const pipeline: PipelineStage[] = [
      {
        $match: {
          createdAt: range.createdAt,
        },
      },
      {
        $group: {
          _id: {
            dayOfWeek: {
              $dayOfWeek: {
                date: '$createdAt',
                timezone: STATISTICS_TIME_ZONE,
              },
            },
            hour: {
              $hour: { date: '$createdAt', timezone: STATISTICS_TIME_ZONE },
            },
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

    return peakHours;
  }

  async getRevenueByDay(
    startDate: string,
    endDate: string,
  ): Promise<RevenueByDayDto[]> {
    const range = statisticsDateRange(startDate, endDate);

    const pipeline: PipelineStage[] = [
      {
        $match: {
          createdAt: range.createdAt,
          estado: { $in: [OrderStatus.ENTREGADO] },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
              timezone: STATISTICS_TIME_ZONE,
            },
          },
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
    const range = statisticsDateRange(startDate, endDate);

    const pipeline: PipelineStage[] = [
      {
        $match: {
          createdAt: range.createdAt,
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
