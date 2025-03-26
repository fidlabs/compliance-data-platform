import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge } from 'prom-client';
import { PgPoolCdpGaugeMetricsType } from './metrics';
import { Injectable } from '@nestjs/common';
import { MetricsBase } from '../metrics-base';

@Injectable()
export class PgPoolMetrics extends MetricsBase {
  constructor(
    @InjectMetric(PgPoolCdpGaugeMetricsType.PG_POOL_CLIENT_EXIST_COUNT)
    private readonly pgPoolClientExist: Gauge<string>,

    @InjectMetric(PgPoolCdpGaugeMetricsType.PG_POOL_CLIENT_IDLE_COUNT)
    private readonly pgPoolClientIdle: Gauge<string>,

    @InjectMetric(PgPoolCdpGaugeMetricsType.PG_POOL_CLIENT_IDLE_COUNT)
    private readonly pgPoolClientWaiting: Gauge<string>,
  ) {
    super();
  }

  setPgPoolExistClientCount = (value: number) =>
    this.pgPoolClientExist
      .labels({
        env: this.env,
      })
      .set(value);

  setPgPoolIdleClientCount = (value: number) =>
    this.pgPoolClientIdle
      .labels({
        env: this.env,
      })
      .set(value);

  setPgPoolWaitingClientCount = (value: number) =>
    this.pgPoolClientWaiting
      .labels({
        env: this.env,
      })
      .set(value);
}
