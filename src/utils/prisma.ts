import { Prisma } from 'prisma/generated/client';

export const modelName = (model: Prisma.ModelName) =>
  Prisma.sql([`"${model}"`]);
