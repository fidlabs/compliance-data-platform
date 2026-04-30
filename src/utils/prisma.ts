import { Prisma } from 'prisma/generated/client';

export const modelName = (model: Prisma.ModelName) =>
  Prisma.sql([`"${model}"`]);

function safeBigintOperation(
  a: bigint | number | undefined,
  b: bigint | number | undefined,
  type: 'addition' | 'multiplication',
): bigint | number | undefined {
  if (typeof a === 'undefined' && typeof b === 'undefined') {
    return undefined;
  }

  if (typeof b !== 'undefined' && typeof a === 'undefined') {
    return BigInt(b);
  }

  if (typeof b === 'undefined' && typeof a !== 'undefined') {
    return BigInt(a);
  }

  switch (type) {
    case 'addition':
      return BigInt(a) + BigInt(b);
    case 'multiplication':
      return BigInt(a) * BigInt(b);
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

  return {
    set: updateB.set ?? updateA.set,
    increment: safeBigintOperation(
      updateA.increment,
      updateB.increment,
      'addition',
    ),
    decrement: safeBigintOperation(
      updateA.decrement,
      updateB.decrement,
      'addition',
    ),
    multiply: safeBigintOperation(
      updateA.multiply,
      updateB.multiply,
      'multiplication',
    ),
    divide: safeBigintOperation(
      updateA.divide,
      updateB.divide,
      'multiplication',
    ),
  };
}
