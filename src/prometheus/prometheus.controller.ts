import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { PrometheusController } from '@willsoto/nestjs-prometheus';
import { PrismaService } from 'src/db/prisma.service';
import { PrometheusAuthGuard } from './guards/prometheus.guard';

@Controller()
@ApiExcludeController()
export class PrometheusMetricController extends PrometheusController {
  constructor(private readonly prismaService: PrismaService) {
    super();
  }

  @Get()
  @UseGuards(PrometheusAuthGuard)
  public async index(@Res({ passthrough: true }) response: Response) {
    return super.index(response);
  }

  @Get('db-metrics')
  @UseGuards(PrometheusAuthGuard)
  async dbMetrics() {
    const prismaMetrics = await this.prismaService.getMetrics();
    return prismaMetrics;
  }
}
