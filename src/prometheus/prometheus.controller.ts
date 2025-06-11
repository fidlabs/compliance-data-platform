import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { PrismaService } from 'src/db/prisma.service';
import { PrometheusAuthGuard } from './guards/prometheus.guard';

@Controller()
@ApiExcludeController()
export class PrometheusMetricController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get('db-metrics')
  @UseGuards(PrometheusAuthGuard)
  async dbMetrics() {
    return await this.prismaService.getMetrics();
  }
}
