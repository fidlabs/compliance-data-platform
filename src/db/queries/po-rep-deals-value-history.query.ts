import { AliasableExpression, Expression, expressionBuilder } from 'kysely';
import { F0Id } from 'src/utils/utils';
import { PoRepDealState } from '../auto-generated/enums';
import { QueryBuilder } from '../query-builder';
import { calcualtePredictedDealRevenue } from './helpers/calculate-predicted-deal-revenue.helper';
import { createGenericStringFilter } from './helpers/create-generic-string-filter.helper';
import { filecoinBlockNumberToTimestamp } from './helpers/filecoin-block-number-to-timestamp.helper';

type F0IdLike = Parameters<typeof F0Id.from>[0];

export interface PoRepDealsValueHistoryQueryParameters {
  genesisTimestamp: number | bigint;
  providersIds?: F0IdLike | F0IdLike[] | null;
  windowSize: 'day' | 'week' | 'month';
}

function mapF0IdLike(input: F0IdLike): string {
  return F0Id.from(input).toBigInt().toString();
}

function truncateToWindowSize(
  expression: Expression<Date>,
  windowSize: PoRepDealsValueHistoryQueryParameters['windowSize'],
): AliasableExpression<Date> {
  const eb = expressionBuilder();

  return eb.cast<Date>(
    eb.fn<Date>('date_trunc', [eb.val(windowSize), expression, eb.val('UTC')]),
    'date',
  );
}

export function createPoRepDealsValueHistoryQuery(
  qb: QueryBuilder,
  {
    genesisTimestamp,
    providersIds,
    windowSize,
  }: PoRepDealsValueHistoryQueryParameters,
) {
  const dealsWithRailsCTE = qb
    .selectFrom('po_rep_deal as d')
    .innerJoin('filecoin_pay_rail as r', 'd.railId', 'r.railId')
    .select((eb) => [
      'd.dealId as deal_id',
      'r.token as token_address',
      truncateToWindowSize(
        filecoinBlockNumberToTimestamp({
          genesisTimestamp: genesisTimestamp,
          blockNumber: eb.ref('r.createdAtBlock'),
        }),
        windowSize,
      ).as('window_start'),
    ])
    .where(({ and, exists, not, ref, selectFrom }) =>
      and([
        createGenericStringFilter(
          ref('d.providerId'),
          providersIds,
          mapF0IdLike,
        ),
        not(
          exists(
            selectFrom('po_rep_deal_state_change as dsc')
              .select('dsc.deal_id')
              .where(({ and, eb, ref }) =>
                and([
                  eb('dsc.deal_id', '=', ref('d.dealId')),
                  eb('state', '=', PoRepDealState.REJECTED),
                ]),
              ),
          ),
        ),
      ]),
    );

  return qb
    .with('deals_with_rails', dealsWithRailsCTE)
    .selectFrom('deals_with_rails as dwr')
    .innerJoin('po_rep_deal_terms as dt', 'dwr.deal_id', 'dt.deal_id')
    .select((eb) => [
      'window_start',
      'token_address',
      eb.fn
        .sum(
          calcualtePredictedDealRevenue({
            dealDurationDays: eb.ref('dt.duration_days'),
            dealSizeBytes: eb.ref('dt.deal_size_bytes'),
            pricePerSectorPerMonth: eb.ref('dt.price_per_sector_per_month'),
          }),
        )
        .as('window_total'),
    ])
    .groupBy(['window_start', 'token_address'])
    .orderBy('window_start', 'asc');
}
