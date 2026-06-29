import { AliasableExpression, Expression, expressionBuilder } from 'kysely';
import { DB } from '../../auto-generated/types';

type Numerical = string | number | bigint;
type NumericalExpression = Expression<Numerical>;

export interface CalculatePredictedDealRevenueParameters {
  dealSizeBytes: NumericalExpression;
  dealDurationDays: NumericalExpression;
  pricePerSectorPerMonth: NumericalExpression;
}

const sectorSizeBytes = 34_359_738_368; // 32 GiB

export function calcualtePredictedDealRevenue({
  dealSizeBytes,
  dealDurationDays,
  pricePerSectorPerMonth,
}: CalculatePredictedDealRevenueParameters): AliasableExpression<Numerical> {
  const eb = expressionBuilder<DB>();

  const dealSectorsCountExpression = eb(
    eb.cast<Numerical>(dealSizeBytes, 'decimal'),
    '/',
    sectorSizeBytes,
  );

  const dealMonthsCountExpression = eb(
    eb.cast<Numerical>(dealDurationDays, 'decimal'),
    '/',
    30,
  );

  const monthlyPaymentsCountExpression = eb(
    eb.fn<Numerical>('ceil', [dealSectorsCountExpression]),
    '*',
    eb.fn<Numerical>('ceil', [dealMonthsCountExpression]),
  );

  return eb(monthlyPaymentsCountExpression, '*', pricePerSectorPerMonth);
}
