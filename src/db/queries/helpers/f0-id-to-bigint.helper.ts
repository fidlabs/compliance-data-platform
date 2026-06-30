import { AliasableExpression, Expression, expressionBuilder } from 'kysely';
import { DB } from '../../auto-generated/types';

export function f0IdToBigInt(
  input: Expression<string>,
): AliasableExpression<string> {
  const eb = expressionBuilder<DB>();
  return eb.cast<string>(eb.fn('substring', [input, eb.lit(2)]), 'bigint');
}
