import { F0Id } from 'src/utils/utils';
import { dbEnums } from '..';
import {
  StorageProviderUrlFinderMetricResultCodeType,
  StorageProviderUrlFinderMetricType,
} from '../auto-generated/enums';
import { QueryBuilder } from '../query-builder';
import { createGenericStringFilter } from './helpers/create-generic-string-filter.helper';
import { f0IdToBigInt } from './helpers/f0-id-to-bigint.helper';

type F0IdLike = Parameters<typeof F0Id.from>[0];

export interface CreateProvidersAverageSlisQueryParameters {
  maxTestDate?: Date | null;
  minTestDate?: Date | null;
  providersIds?: F0IdLike | F0IdLike[] | null;
}

function mapF0IdLike(input: F0IdLike): string {
  return F0Id.from(input).toString();
}

export function createProvidersAverageSlisQuery(
  qb: QueryBuilder,
  parameters: CreateProvidersAverageSlisQueryParameters,
) {
  const { minTestDate, maxTestDate, providersIds } = parameters;

  let sliCTE = qb
    .selectFrom('storage_provider_url_finder_metric_value as mv')
    .innerJoin(
      'storage_provider_url_finder_metric as m',
      'm.id',
      'mv.metric_id',
    )
    .select(({ eb, fn }) => [
      f0IdToBigInt(eb.ref('mv.provider')).as('provider_id'),
      fn
        .avg('mv.value')
        .filterWhere(
          'm.metric_type',
          '=',
          dbEnums.StorageProviderUrlFinderMetricType.RPA_RETRIEVABILITY,
        )
        .as('retrievability'),
      fn
        .avg('mv.value')
        .filterWhere(
          'm.metric_type',
          '=',
          dbEnums.StorageProviderUrlFinderMetricType.BANDWIDTH,
        )
        .as('bandwidth'),
      fn
        .avg('mv.value')
        .filterWhere(
          'm.metric_type',
          '=',
          dbEnums.StorageProviderUrlFinderMetricType.TTFB,
        )
        .as('latency'),
    ])
    .where('m.metric_type', 'in', [
      StorageProviderUrlFinderMetricType.RPA_RETRIEVABILITY,
      StorageProviderUrlFinderMetricType.BANDWIDTH,
      StorageProviderUrlFinderMetricType.TTFB,
    ])
    .where((eb) =>
      createGenericStringFilter(
        eb.ref('mv.provider'),
        providersIds,
        mapF0IdLike,
      ),
    )
    .groupBy('mv.provider');

  let ipniCTE = qb
    .selectFrom('storage_provider_url_finder_daily_snapshot')
    .select(({ eb, fn }) => [
      f0IdToBigInt(eb.ref('provider')).as('provider_id'),
      eb(
        fn
          .count('id')
          .filterWhere(
            'result_code',
            '=',
            StorageProviderUrlFinderMetricResultCodeType.SUCCESS,
          ),
        '/',
        eb
          .case()
          .when(fn.count('id'), '=', 0)
          .then(null)
          .else(fn.count('id'))
          .end(),
      ).as('indexing'),
    ])
    .where((eb) =>
      createGenericStringFilter(eb.ref('provider'), providersIds, mapF0IdLike),
    )
    .groupBy('provider');

  if (minTestDate) {
    sliCTE = sliCTE.where('tested_at', '>=', minTestDate);
    ipniCTE = ipniCTE.where('tested_at', '>=', minTestDate);
  }

  if (maxTestDate) {
    sliCTE = sliCTE.where('tested_at', '<=', maxTestDate);
    ipniCTE = ipniCTE.where('tested_at', '<=', maxTestDate);
  }

  return qb
    .with('sli', sliCTE)
    .with('ipni', ipniCTE)
    .selectFrom('ipni')
    .leftJoin('sli', 'ipni.provider_id', 'sli.provider_id')
    .select([
      'ipni.provider_id as provider_id',
      'ipni.indexing as average_indexing',
      'sli.retrievability as average_retrievability',
      'sli.bandwidth as average_bandwidth',
      'sli.latency as average_latency',
    ]);
}
