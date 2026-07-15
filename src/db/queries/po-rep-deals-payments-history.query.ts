import { AliasableExpression, Expression, expressionBuilder } from 'kysely';
import { F0Id } from 'src/utils/utils';
import { QueryBuilder } from '../query-builder';
import { createGenericStringFilter } from './helpers/create-generic-string-filter.helper';
import { filecoinBlockNumberToTimestamp } from './helpers/filecoin-block-number-to-timestamp.helper';

type F0IdLike = Parameters<typeof F0Id.from>[0];

export interface PoRepDealsPaymentsHistoryQueryParameters {
  genesisTimestamp: number | bigint;
  netAmount: boolean;
  providersIds?: F0IdLike | F0IdLike[] | null;
  windowSize: 'day' | 'week' | 'month';
}

function mapF0IdLike(input: F0IdLike): string {
  return F0Id.from(input).toBigInt().toString();
}

function truncateToWindowSize(
  expression: Expression<Date>,
  windowSize: PoRepDealsPaymentsHistoryQueryParameters['windowSize'],
): AliasableExpression<Date> {
  const eb = expressionBuilder();

  return eb.cast<Date>(
    eb.fn<Date>('date_trunc', [eb.val(windowSize), expression, eb.val('UTC')]),
    'date',
  );
}

export function createPoRepDealsPaymentsHistoryQuery(
  qb: QueryBuilder,
  {
    genesisTimestamp,
    netAmount,
    providersIds,
    windowSize,
  }: PoRepDealsPaymentsHistoryQueryParameters,
) {
  return qb
    .selectFrom('filecoin_pay_payment as p')
    .innerJoin('filecoin_pay_rail as r', 'r.railId', 'p.railId')
    .innerJoin('po_rep_deal as d', 'd.railId', 'p.railId')
    .select((eb) => [
      truncateToWindowSize(
        filecoinBlockNumberToTimestamp({
          genesisTimestamp: genesisTimestamp,
          blockNumber: eb.ref('p.createdAtBlock'),
        }),
        windowSize,
      ).as('window_start'),
      'r.token as token_address',
      eb.fn
        .sum(netAmount ? 'p.netPayeeAmount' : 'p.totalAmount')
        .as('window_total'),
    ])
    .where('p.oneTime', '=', false)
    .where((eb) =>
      createGenericStringFilter(
        eb.ref('d.providerId'),
        providersIds,
        mapF0IdLike,
      ),
    )
    .groupBy(['window_start', 'token_address'])
    .orderBy('window_start', 'asc');
}
