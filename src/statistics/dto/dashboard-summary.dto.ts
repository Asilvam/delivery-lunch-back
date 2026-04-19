export class DashboardSummaryDto {
  pedidosTotales: number;
  pedidosCompletados: number;
  pedidosCancelados: number;
  tasaCompletacion: number;
  ingresosTotales: number;
  ticketPromedio: number;
  periodo: {
    startDate: string;
    endDate: string;
  };
}

export class TopDishDto {
  platoId: string;
  nombre: string;
  cantidadVendida: number;
  ingresosTotales: number;
  porcentajeVentas: number;
}

export class PeakHourDto {
  dayOfWeek: number;
  dayName: string;
  hour: number;
  hourLabel: string;
  count: number;
}

export class RevenueByDayDto {
  date: string;
  total: number;
  pedidosCount: number;
}

export class CancellationStatsDto {
  estado: string;
  count: number;
  porcentaje: number;
}
