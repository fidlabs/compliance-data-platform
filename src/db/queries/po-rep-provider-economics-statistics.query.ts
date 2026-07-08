import { F0Id } from 'src/utils/utils';
import { F0IdInput } from 'src/utils/validators';
import { QueryBuilder } from '../query-builder';
import {
  createFilecoinPayRailsQuery,
  RAIL_STATE,
} from './filecoin-pay-rails.query';
import { calcualtePredictedDealRevenue } from './helpers/calculate-predicted-deal-revenue.helper';

export interface PoRepProviderEconomicsStatisticsQueryParameters {
  providerId: F0Id | F0IdInput;
}

export function createPoRepProviderEconomicsStatisticsQuery(
  qb: QueryBuilder,
  { providerId }: PoRepProviderEconomicsStatisticsQueryParameters,
) {
  const providerIdString = F0Id.from(providerId).toBigInt().toString();

  const railsCTE = createFilecoinPayRailsQuery(qb);

  const dealsCTE = qb
    .with('r', railsCTE)
    .selectFrom('po_rep_deal as d')
    .innerJoin('po_rep_deal_terms as dt', 'd.dealId', 'dt.deal_id')
    .innerJoin('r', 'd.railId', 'r.rail_id')
    .select((eb) => [
      'r.rail_id',
      'r.token_address',
      'r.rail_state',
      calcualtePredictedDealRevenue({
        dealSizeBytes: eb.ref('d.totalDealSize'),
        dealDurationDays: eb.ref('dt.duration_days'),
        pricePerSectorPerMonth: eb.ref('dt.price_per_sector_per_month'),
      }).as('total_deal_revenue'),
      'r.total_amount_settled',
      'r.last_settlement_epoch',
    ])
    .where('d.providerId', '=', providerIdString);

  const intermediateCTE = qb
    .with('d', dealsCTE)
    .selectFrom('d')
    .select((eb) => [
      'token_address',
      eb.fn.count('rail_id').as('total_rails_count'),
      eb.fn
        .count('rail_id')
        .filterWhere('rail_state', '=', RAIL_STATE.ACTIVE)
        .as('active_rails_count'),
      eb.fn
        .coalesce(eb.fn.sum('total_amount_settled'), eb.val(0))
        .as('total_amount_settled'),
      eb.fn
        .coalesce(
          eb.fn
            .sum('total_amount_settled')
            .filterWhere('rail_state', 'in', [
              RAIL_STATE.ACTIVE,
              RAIL_STATE.TERMINATED,
            ]),
          eb.val(0),
        )
        .as('ongoing_deals_amount_settled'),
      eb.fn
        .coalesce(
          eb.fn
            .sum('total_deal_revenue')
            .filterWhere('rail_state', 'in', [
              RAIL_STATE.ACTIVE,
              RAIL_STATE.TERMINATED,
            ]),
          eb.val(0),
        )
        .as('ongoing_deals_total_revenue'),
      eb.fn.max('last_settlement_epoch').as('last_settlement_epoch'),
    ])
    .groupBy('token_address');

  return qb
    .with('stats', intermediateCTE)
    .selectFrom('stats')
    .select((eb) => {
      const predictedRevenue = eb(
        'stats.ongoing_deals_total_revenue',
        '-',
        eb.ref('ongoing_deals_amount_settled'),
      );

      return [
        'token_address',
        'total_rails_count',
        'active_rails_count',
        'total_amount_settled',
        'last_settlement_epoch',
        predictedRevenue.as('predicted_revenue'),
        eb('total_amount_settled', '+', predictedRevenue).as('total_revenue'),
      ];
    });
}
