import { Controller, Get, Logger, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { StatisticsService } from './statistics.service';

@Controller('statistics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class StatisticsController {
  private readonly logger = new Logger(StatisticsController.name);

  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('summary')
  async getDashboardSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    this.logger.log(
      `GET /statistics/summary — ${startDate || 'start'} a ${endDate || 'end'}`,
    );

    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || start;

    return this.statisticsService.getDashboardSummary(start, end);
  }

  @Get('top-dishes')
  async getTopDishes(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit') limit?: number,
  ) {
    this.logger.log(`GET /statistics/top-dishes — limit: ${limit || 10}`);

    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || start;

    return this.statisticsService.getTopDishes(start, end, limit || 10);
  }

  @Get('peak-hours')
  async getPeakHours(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    this.logger.log(`GET /statistics/peak-hours`);

    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || start;

    return this.statisticsService.getPeakHours(start, end);
  }

  @Get('revenue')
  async getRevenueByDay(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    this.logger.log(`GET /statistics/revenue`);

    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || start;

    return this.statisticsService.getRevenueByDay(start, end);
  }

  @Get('cancellations')
  async getCancellationStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    this.logger.log(`GET /statistics/cancellations`);

    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || start;

    return this.statisticsService.getCancellationStats(start, end);
  }
}
