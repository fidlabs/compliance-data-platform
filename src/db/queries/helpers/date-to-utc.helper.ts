import { AliasableExpression, Expression, expressionBuilder } from 'kysely';

export function dateToUTC(
  expression: Expression<Date>,
): AliasableExpression<Date> {
  const eb = expressionBuilder();
  return eb.fn<Date>('timezone', [eb.val('UTC'), expression]);
}
