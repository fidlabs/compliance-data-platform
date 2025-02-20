import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge } from 'prom-client';
import { PgPoolCdpGaugeMetricsType } from './metrics';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PgPoolMetrics {
  constructor(
    @InjectMetric(PgPoolCdpGaugeMetricsType.PG_POOL_ACTIVE_CONNECTIONS_COUNT)
    private readonly pgPoolActiveConnectionsCount: Gauge<string>,

    @InjectMetric(PgPoolCdpGaugeMetricsType.PG_POOL_ALL_CONNECTIONS_COUNT)
    private readonly pgPoolAllConnectionsCount: Gauge<string>,
  ) {}

  setPgPoolActiveConnectionsCount = (value: number) =>
    this.pgPoolActiveConnectionsCount.set(value);

  setPgPoolAllConnectionsCount = (value: number) =>
    this.pgPoolAllConnectionsCount.set(value);
}
