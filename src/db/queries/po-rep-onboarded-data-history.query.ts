import { AliasableExpression, Expression, expressionBuilder } from 'kysely';
import { F0Id } from 'src/utils/utils';
import { QueryBuilder } from '../query-builder';
import { castToInterval } from './helpers/cast-to-inteval.helper';
import { createGenericStringFilter } from './helpers/create-generic-string-filter.helper';
import { filecoinBlockNumberToTimestamp } from './helpers/filecoin-block-number-to-timestamp.helper';
import { PoRepDealState } from '../auto-generated/enums';

type F0IdLike = Parameters<typeof F0Id.from>[0];

export interface CreatePoRepOnboardedDataHistoryQueryParamaters {
  genesisTimestamp: number | bigint;
  providersIds?: F0IdLike | F0IdLike[] | null;
  windowSize: 'day' | 'week' | 'month';
}

function mapF0IdLike(input: F0IdLike): string {
  return F0Id.from(input).toBigInt().toString();
}

function truncateToWindowSize(
  expression: Expression<Date>,
  windowSize: CreatePoRepOnboardedDataHistoryQueryParamaters['windowSize'],
): AliasableExpression<Date> {
  const eb = expressionBuilder();

  return eb.cast<Date>(
    eb.fn<Date>('date_trunc', [eb.val(windowSize), expression, eb.val('UTC')]),
    'date',
  );
}

export function createPoRepOnboardedDataHistoryQuery(
  qb: QueryBuilder,
  {
    genesisTimestamp,
    providersIds,
    windowSize,
  }: CreatePoRepOnboardedDataHistoryQueryParamaters,
) {
  const boundsCTE = qb
    .selectFrom('po_rep_deal')
    .select((eb) => [
      truncateToWindowSize(
        filecoinBlockNumberToTimestamp({
          blockNumber: eb.fn.min('proposedAtBlock'),
          genesisTimestamp: genesisTimestamp,
        }),
        windowSize,
      ).as('start_window'),
      truncateToWindowSize(eb.fn<Date>('now'), windowSize).as('end_window'),
    ])
    .where((eb) =>
      createGenericStringFilter(
        eb.ref('providerId'),
        providersIds,
        mapF0IdLike,
      ),
    );

  const windowDatesCTE = qb
    .with('bounds', boundsCTE)
    .selectFrom('bounds')
    .select((eb) => [
      eb
        .fn<Date>('generate_series', [
          'bounds.start_window',
          'bounds.end_window',
          castToInterval(`1 ${windowSize}`),
        ])
        .as('window_start'),
    ]);

  const railActivationsCTE = qb
    .selectFrom('filecoin_pay_rail')
    .select((eb) => [
      'railId',
      truncateToWindowSize(
        filecoinBlockNumberToTimestamp({
          blockNumber: eb.ref('activatedAtBlock'),
          genesisTimestamp: genesisTimestamp,
        }),
        windowSize,
      ).as('activation_date_truncated'),
    ])
    .where('activatedAtBlock', '<>', '0');

  const windowTotalsCTE = qb
    .with('ra', railActivationsCTE)
    .selectFrom('ra')
    .innerJoin('po_rep_deal as d', 'd.railId', 'ra.railId')
    .select((eb) => [
      'ra.activation_date_truncated as window_start',
      eb.fn.sum('d.totalDealSize').as('window_total'),
    ])
    .where((eb) =>
      createGenericStringFilter(
        eb.ref('providerId'),
        providersIds,
        mapF0IdLike,
      ),
    )
    .where('d.state', '=', PoRepDealState.COMPLETED)
    .groupBy('ra.activation_date_truncated');

  return qb
    .with('wd', windowDatesCTE)
    .with('wt', windowTotalsCTE)
    .selectFrom('wd')
    .leftJoin('wt', 'wd.window_start', 'wt.window_start')
    .select((eb) => [
      'wd.window_start',
      eb.fn.coalesce('wt.window_total', eb.val(0)).as('window_total'),
      eb.fn
        .sum(eb.fn.coalesce('wt.window_total', eb.val(0)))
        .over((eb) => eb.orderBy('wd.window_start'))
        .as('cumulative_total'),
    ]);
}
