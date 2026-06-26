import { Expression, expressionBuilder, SqlBool } from 'kysely';
import { DB } from '../../auto-generated/types';

type StringifyFn<T> = T extends string ? never : (input: T) => string;
type Input<T> = T | T[] | null | undefined;

export function createGenericStringFilter<T>(
  expression: Expression<string>,
  match: Input<T>,
  stringify: T extends string ? undefined : StringifyFn<T>,
): Expression<SqlBool>;
export function createGenericStringFilter(
  expression: Expression<string>,
  match: Input<string>,
): Expression<SqlBool>;
export function createGenericStringFilter(
  expression: Expression<string>,
  match: unknown | unknown[] | null | undefined,
  stringify?: StringifyFn<any>,
): Expression<SqlBool> {
  const eb = expressionBuilder<DB>();

  if (match === null || match === undefined) {
    return eb.val(true);
  }

  const matchesArray = Array.isArray(match) ? match : [match];
  const stringMatches = stringify
    ? matchesArray.map(stringify)
    : (matchesArray as string[]);

  return stringMatches.length === 1
    ? eb(expression, '=', stringMatches[0])
    : eb(expression, 'in', stringMatches);
}
