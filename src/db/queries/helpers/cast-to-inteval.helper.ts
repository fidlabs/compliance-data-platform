import { AliasableExpression, Expression, sql } from 'kysely';
import { PostgresInterval } from '../../types';

export function castToInterval(
  expressionOrString: Expression<string> | string,
): AliasableExpression<PostgresInterval> {
  return sql`${expressionOrString}::interval`;
}
