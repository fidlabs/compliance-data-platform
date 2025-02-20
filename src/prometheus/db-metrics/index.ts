import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge } from 'prom-client';
import { PgPoolCdpGaugeMetricsType } from './metrics';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PgPoolMetrics {
  constructor(
    @InjectMetric(PgPoolCdpGaugeMetricsType.PG_POOL_CLIENT_EXIST_COUNT)
    private readonly pgPoolClientExist: Gauge<string>,

    @InjectMetric(PgPoolCdpGaugeMetricsType.PG_POOL_CLIENT_IDLE_COUNT)
    private readonly pgPoolClientIdle: Gauge<string>,

    @InjectMetric(PgPoolCdpGaugeMetricsType.PG_POOL_CLIENT_IDLE_COUNT)
    private readonly pgPoolClientWaiting: Gauge<string>,
  ) {}

  setPgPoolExistClientCount = (value: number) =>
    this.pgPoolClientExist.set(value);

  setPgPoolIdleClientCount = (value: number) =>
    this.pgPoolClientIdle.set(value);

  setPgPoolWaitingClientCount = (value: number) =>
    this.pgPoolClientWaiting.set(value);
}
