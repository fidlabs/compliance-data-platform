import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MetricsBase {
  private configService: ConfigService;
  protected env: string = '';

  constructor() {
    this.configService = new ConfigService();
    this.env = this.configService.get<string>('PROMETHEUS_METRICS_ENV');
  }
}
