import { Prisma } from 'prisma/generated/client';

export const modelName = (model: Prisma.ModelName) =>
  Prisma.sql([`"${model}"`]);

function bigIntUpdateIncludeOperations(
  update: Prisma.BigIntFieldUpdateOperationsInput,
  operations: Array<keyof Prisma.BigIntFieldUpdateOperationsInput>,
): boolean {
  return operations.some((operation) => {
    return typeof update[operation] !== 'undefined';
  });
}

function safeBigIntReverse(
  input: bigint | number | undefined,
): bigint | number | undefined {
  switch (typeof input) {
    case 'undefined':
      return undefined;
    case 'number':
      return input * -1;
    case 'bigint':
      return input * -1n;
  }
}

function safeBigintOperation(
  type: 'addition' | 'multiplication',
  ...input: Array<bigint | number | undefined>
): bigint | number | undefined {
  const isEmpty = input.every((i) => typeof i === 'undefined');

  if (isEmpty) {
    return undefined;
  }

  const hasNumbers = input.some((i) => typeof i === 'number');

  if (hasNumbers) {
    return input.reduce<number>((result, item) => {
      const itemParsed = Number(item ?? 0);
      return type === 'addition' ? result + itemParsed : result * itemParsed;
    }, 0);
  } else {
    return input.reduce<bigint>((result, item) => {
      const itemParsed = BigInt(item ?? 0n);
      return type === 'addition' ? result + itemParsed : result * itemParsed;
    }, 0n);
  }
}

export function mergeBigIntFieldUpdate(
  updateA:
    | Prisma.BigIntFieldUpdateOperationsInput
    | bigint
    | number
    | undefined,
  updateB:
    | Prisma.BigIntFieldUpdateOperationsInput
    | bigint
    | number
    | undefined,
): Prisma.BigIntFieldUpdateOperationsInput | bigint | number | undefined {
  if (typeof updateA !== 'object' || typeof updateB !== 'object') {
    return updateB;
  }

  if (
    typeof updateB.increment !== 'undefined' ||
    typeof updateB.decrement !== 'undefined'
  ) {
    if (
      bigIntUpdateIncludeOperations(updateB, ['set', 'divide', 'multiply']) ||
      bigIntUpdateIncludeOperations(updateA, ['set', 'divide', 'multiply'])
    ) {
      throw new TypeError(
        'Incompatible updates provided. Can not mix "increment"/"decrement" with "set"/"divide"/"multiply" operations.',
      );
    }

    const balance = safeBigintOperation(
      'addition',
      updateA.increment,
      updateB.increment,
      safeBigIntReverse(updateA.decrement),
      safeBigIntReverse(updateB.decrement),
    );

    return balance >= 0
      ? {
          increment: balance,
        }
      : {
          decrement: safeBigIntReverse(balance),
        };
  }

  if (typeof updateB.multiply !== 'undefined') {
    if (
      bigIntUpdateIncludeOperations(updateB, [
        'set',
        'divide',
        'increment',
        'decrement',
      ]) ||
      bigIntUpdateIncludeOperations(updateA, [
        'set',
        'divide',
        'increment',
        'decrement',
      ])
    ) {
      throw new TypeError(
        'Incompatible updates provided. Can not mix "multiply" with "set"/"divide"/"increment"/"decrement" operations.',
      );
    }

    return {
      multiply: safeBigintOperation(
        'multiplication',
        updateA.multiply,
        updateB.multiply,
      ),
    };
  }

  if (typeof updateB.divide !== 'undefined') {
    if (
      bigIntUpdateIncludeOperations(updateB, [
        'set',
        'multiply',
        'increment',
        'decrement',
      ]) ||
      bigIntUpdateIncludeOperations(updateA, [
        'set',
        'multiply',
        'increment',
        'decrement',
      ])
    ) {
      throw new TypeError(
        'Incompatible updates provided. Can not mix "divide" with "set"/"multiply"/"increment"/"decrement" operations.',
      );
    }

    return {
      divide: safeBigintOperation(
        'multiplication',
        updateA.divide,
        updateB.divide,
      ),
    };
  }

  return updateB;
}
