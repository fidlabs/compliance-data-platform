import { DateTime } from 'luxon';
import { F0Id } from 'src/utils/utils';
import { QueryBuilder } from '../query-builder';
import {
  createFilecoinPayRailsQuery,
  RailState,
} from './filecoin-pay-rails.query';
import { calcualtePredictedDealRevenue } from './helpers/calculate-predicted-deal-revenue.helper';
import { createGenericStringFilter } from './helpers/create-generic-string-filter.helper';
import { createProvidersAverageSlisQuery } from './providers-average-sli.query';
import { PoRepDealState } from '../auto-generated/enums';

type F0IdLike = Parameters<typeof F0Id.from>[0];

export interface CreatePoRepDealsQueryParameters {
  providersIds?: F0IdLike | F0IdLike[] | null;
  railStates?: RailState | RailState[] | null;
  activeOnly?: boolean;
}

function mapF0IdLike(input: F0IdLike): string {
  return F0Id.from(input).toBigInt().toString();
}

export function createPoRepDealsQuery(
  qb: QueryBuilder,
  {
    activeOnly = false,
    providersIds,
    railStates,
  }: CreatePoRepDealsQueryParameters = {},
) {
  const thirtyDaysAgoUTC = DateTime.utc()
    .startOf('day')
    .minus({ days: 30 })
    .toJSDate();

  const query = qb
    .with(
      'sli',
      createProvidersAverageSlisQuery(qb, {
        providersIds: providersIds,
        minTestDate: thirtyDaysAgoUTC,
      }),
    )
    .with('rails', createFilecoinPayRailsQuery(qb))
    .with('deal_data', (db) =>
      db
        .selectFrom('po_rep_deal as d')
        .innerJoin('po_rep_deal_requirements as dr', 'd.dealId', 'dr.dealId')
        .innerJoin('po_rep_deal_terms as dt', 'd.dealId', 'dt.deal_id')
        .leftJoin('rails as r', 'd.railId', 'r.rail_id')
        .leftJoin('sli', 'd.providerId', 'sli.provider_id')
        .select((eb) => [
          'd.dealId as deal_id',
          'd.providerId as provider_id',
          'd.client as client_address',
          'd.state as deal_state',
          'd.totalDealSize as deal_size_bytes',
          'd.railId as rail_id',
          'r.token_address',
          'r.rail_state',
          'r.rail_activated_at_epoch',
          eb
            .and([
              eb(eb.ref('state'), '=', PoRepDealState.COMPLETED),
              eb.or([
                eb(eb.ref('r.rail_state'), '=', 'active'),
                eb(eb.ref('r.rail_state'), '=', 'terminated'),
              ]),
            ])
            .as('active'),
          eb
            .case()
            .when('dr.retrievabilityBps', '=', 0)
            .then(null)
            .else(
              eb(
                eb.cast<number | string>('dr.retrievabilityBps', 'decimal'),
                '/',
                10000,
              ),
            )
            .end()
            .as('min_required_retrievability'),
          eb
            .case()
            .when('dr.bandwidthMbps', '=', 0)
            .then(null)
            .else(eb.ref('dr.bandwidthMbps'))
            .end()
            .as('min_required_bandwidth_mbps'),
          eb
            .case()
            .when('dr.latencyMs', '=', 0)
            .then(null)
            .else(eb.ref('dr.latencyMs'))
            .end()
            .as('max_required_latency_ms'),
          eb
            .case()
            .when('dr.indexingPct', '=', 0)
            .then(null)
            .else(
              eb(
                eb.cast<number | string>('dr.indexingPct', 'decimal'),
                '/',
                100,
              ),
            )
            .end()
            .as('min_required_indexing'),
          'sli.average_retrievability as predicted_average_retrievability',
          'sli.average_bandwidth as predicted_average_bandwidth',
          'sli.average_latency as predicted_average_latency',
          'sli.average_indexing as predicted_average_indexing',
          'dt.price_per_sector_per_month as price_per_sector_per_month',
          calcualtePredictedDealRevenue({
            dealSizeBytes: eb.ref('d.totalDealSize'),
            dealDurationDays: eb.ref('dt.duration_days'),
            pricePerSectorPerMonth: eb.ref('dt.price_per_sector_per_month'),
          }).as('predicted_deal_revenue'),
          'r.total_settlements_count',
          'r.total_amount_settled',
          'r.last_settlement_epoch',
          'd.proposedAtBlock as deal_created_at_epoch',
        ])
        .where((eb) =>
          createGenericStringFilter(
            eb.ref('d.providerId'),
            providersIds,
            mapF0IdLike,
          ),
        ),
    )
    .selectFrom('deal_data')
    .where((eb) => createGenericStringFilter(eb.ref('rail_state'), railStates));

  if (activeOnly) {
    query.where('active', '=', true);
  }

  return query;
}
