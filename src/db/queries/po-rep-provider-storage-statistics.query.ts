import { F0Id } from 'src/utils/utils';
import { F0IdInput } from 'src/utils/validators';
import { PoRepDealState } from '../auto-generated/enums';
import { QueryBuilder } from '../query-builder';

export interface PoRepProviderStorageStatisticsQueryParameters {
  providerId: F0Id | F0IdInput;
}

export function createPoRepProviderStorageStatisticsQuery(
  qb: QueryBuilder,
  { providerId }: PoRepProviderStorageStatisticsQueryParameters,
) {
  const providerIdString = F0Id.from(providerId).toBigInt().toString();

  const dealsCTE = qb
    .selectFrom('po_rep_deal as d')
    .leftJoin('filecoin_pay_rail as r', 'd.railId', 'r.railId')
    .select((eb) => [
      'd.providerId',
      'd.dealId',
      'totalDealSize',
      eb
        .and([
          eb('d.state', '=', PoRepDealState.COMPLETED),
          eb('r.finalized', '=', false),
          eb('r.activatedAtBlock', '>', '0'),
        ])
        .as('onboarded'),
    ])
    .where('d.providerId', '=', providerIdString);

  return qb
    .with('deals', dealsCTE)
    .selectFrom('po_rep_storage_provider as p')
    .leftJoin('deals as d', 'd.providerId', 'p.providerId')
    .select((eb) => [
      eb.fn.coalesce(eb.fn.count('d.dealId'), eb.val(0)).as('totalDealsCount'),
      eb.fn
        .coalesce(
          eb.fn.count('d.dealId').filterWhere('d.onboarded', '=', true),
          eb.val(0),
        )
        .as('onbardedDealsCount'),
      'availableBytes',
      'pendingBytes',
      'committedBytes',
      eb.fn
        .coalesce(
          eb.fn.sum('d.totalDealSize').filterWhere('d.onboarded', '=', true),
          eb.val(0),
        )
        .as('onboardedBytes'),
    ])
    .groupBy('p.providerId')
    .where('p.providerId', '=', providerIdString);
}
