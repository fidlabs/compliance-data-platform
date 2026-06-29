import { QueryBuilder } from '../query-builder';

export type RailState = (typeof RAIL_STATE)[keyof typeof RAIL_STATE];

export const RAIL_STATE = {
  FINALIZED: 'finalized',
  TERMINATED: 'terminated',
  ACTIVE: 'active',
  IDLE: 'idle',
} as const;

export function createFilecoinPayRailsQuery(qb: QueryBuilder) {
  return qb
    .selectFrom('filecoin_pay_rail as r')
    .leftJoin('filecoin_pay_payment as p', (join) => {
      return join
        .onRef('r.railId', '=', 'p.railId')
        .on('p.oneTime', '=', false);
    })
    .select((eb) => [
      'r.railId as rail_id',
      'r.token as token_address',
      eb
        .case()
        .when('r.finalized', '=', true)
        .then(RAIL_STATE.FINALIZED)
        .when('r.endEpoch', '>', '0')
        .then(RAIL_STATE.TERMINATED)
        .when('r.activatedAtBlock', '>', '0')
        .then(RAIL_STATE.ACTIVE)
        .else(RAIL_STATE.IDLE)
        .end()
        .as('rail_state'),
      eb
        .case()
        .when('r.activatedAtBlock', '=', '0')
        .then(null)
        .else('r.activatedAtBlock')
        .end()
        .as('rail_activated_at_epoch'),
      eb.fn
        .coalesce(eb.fn.sum('totalAmount'), eb.lit(0))
        .as('total_amount_settled'),
      eb.fn
        .coalesce(eb.fn.count<number>('p.id'), eb.lit(0))
        .as('total_settlements_count'),
      eb.fn.max('p.createdAtBlock').as('last_settlement_epoch'),
    ])
    .groupBy('r.railId');
}
