import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { PrometheusController } from '@willsoto/nestjs-prometheus';
import { PrometheusAuthGuard } from './guards/prometheus.guard';

@Controller()
@ApiExcludeController()
export class PrometheusCustomMetricController extends PrometheusController {
  @Get()
  @UseGuards(PrometheusAuthGuard)
  public async index(@Res({ passthrough: true }) response: Response) {
    return super.index(response);
  }
}
