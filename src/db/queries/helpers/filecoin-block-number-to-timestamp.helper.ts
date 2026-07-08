import { AliasableExpression, Expression, expressionBuilder } from 'kysely';
import { DB } from '../../auto-generated/types';

type NumericalExpressionOrNumber =
  | Expression<string | number | bigint>
  | number
  | bigint;

export interface FilecoinBlockNumberToTimestampOptions {
  blockNumber: NumericalExpressionOrNumber;
  genesisTimestamp: NumericalExpressionOrNumber;
}

function inputToExpression(
  input: NumericalExpressionOrNumber,
): Expression<string | number | bigint> {
  if (typeof input === 'number' || typeof input === 'bigint') {
    return expressionBuilder().val(input);
  }

  return input;
}

export function filecoinBlockNumberToTimestamp({
  blockNumber,
  genesisTimestamp,
}: FilecoinBlockNumberToTimestampOptions): AliasableExpression<Date> {
  const eb = expressionBuilder<DB>();
  const elapsedSeconds = eb(inputToExpression(blockNumber), '*', 30);
  const seconds = eb(elapsedSeconds, '+', inputToExpression(genesisTimestamp));
  return eb.fn('to_timestamp', [seconds]);
}
