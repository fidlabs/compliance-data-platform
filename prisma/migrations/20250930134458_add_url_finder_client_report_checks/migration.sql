-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AllocatorReportCheck" ADD VALUE 'STORAGE_PROVIDER_URL_FINDER_RETRIEVABILITY_ZERO';
ALTER TYPE "AllocatorReportCheck" ADD VALUE 'STORAGE_PROVIDER_URL_FINDER_RETRIEVABILITY_75';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ClientReportCheck" ADD VALUE 'STORAGE_PROVIDER_URL_FINDER_RETRIEVABILITY_ZERO';
ALTER TYPE "ClientReportCheck" ADD VALUE 'STORAGE_PROVIDER_URL_FINDER_RETRIEVABILITY_75';
