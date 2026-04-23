import {
  Controller,
  Post,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { StatisticsService } from './statistics.service';

/**
 * Endpoint temporal solo para limpieza de cache de estadísticas.
 * ¡Eliminar o deshabilitar antes de producción final!
 */
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('dev-tools')
@ApiBearerAuth()
@Controller('dev-tools')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class DevToolsController {
  private readonly logger = new Logger(DevToolsController.name);
  constructor(private readonly statisticsService: StatisticsService) {}

@Post('clear-statistics-cache')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Limpia el caché estadístico (temporal, solo admin)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  clearStatisticsCache(): void {
    this.logger.warn(
      'Limpieza manual de cache estadístico solicitada vía endpoint.',
    );
    this.statisticsService.clearCache();
  }
}
