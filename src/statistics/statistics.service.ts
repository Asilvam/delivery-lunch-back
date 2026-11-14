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
  listos: number;
  menusVendidos: number;
  porCobrar: number;
  sinRegistro: number;
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

  async getCompletedOrders(startDate: string, endDate: string) {
    const range = statisticsDateRange(startDate, endDate);
    return this.orderModel
      .find({
        createdAt: range.createdAt,
        estado: { $in: [OrderStatus.ENTREGADO, OrderStatus.CANCELADO] },
      })
      .select(
        'menuId fecha cliente telefono total estado items validadoPorAdmin createdAt updatedAt aceptadoEn listoEn entregadoEn canceladoEn pagado medioPago pagadoEn',
      )
      .sort({ createdAt: -1, _id: -1 })
      .lean()
      .exec();
  }

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
          porCobrar: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$estado', OrderStatus.ENTREGADO] },
                    { $eq: ['$pagado', false] },
                  ],
                },
                '$total',
                0,
              ],
            },
          },
          sinRegistro: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$estado', OrderStatus.ENTREGADO] },
                    { $eq: [{ $ifNull: ['$pagado', null] }, null] },
                  ],
                },
                1,
                0,
              ],
            },
          },
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
          listos: {
            $sum: { $cond: [{ $eq: ['$estado', OrderStatus.LISTO] }, 1, 0] },
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
      listos: 0,
      menusVendidos: 0,
      porCobrar: 0,
      sinRegistro: 0,
    };

    const [paid] = await this.orderModel
      .aggregate<{ total: number; efectivo: number; transferencia: number }>([
        { $match: { pagado: true, pagadoEn: range.createdAt } },
        {
          $group: {
            _id: null,
            total: { $sum: '$total' },
            efectivo: {
              $sum: {
                $cond: [{ $eq: ['$medioPago', 'efectivo'] }, '$total', 0],
              },
            },
            transferencia: {
              $sum: {
                $cond: [{ $eq: ['$medioPago', 'transferencia'] }, '$total', 0],
              },
            },
          },
        },
      ])
      .exec();

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
      pedidosListos: stats.listos,
      menusVendidos: stats.menusVendidos,
      tasaCompletacion: Math.round(tasaCompletacion * 100) / 100,
      ingresosTotales: Math.round(stats.ingresosTotales),
      ticketPromedio: Math.round(ticketPromedio),
      pagos: {
        total: paid?.total ?? 0,
        efectivo: paid?.efectivo ?? 0,
        transferencia: paid?.transferencia ?? 0,
        porCobrar: stats.porCobrar ?? 0,
        sinRegistro: stats.sinRegistro ?? 0,
      },
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
