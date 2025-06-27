-- AlterEnum
ALTER TYPE "ClientReportCheck" ADD VALUE 'INACTIVITY';

-- AlterTable
ALTER TABLE "client_report" ADD COLUMN     "available_datacap" BIGINT,
ADD COLUMN     "last_datacap_received" TIMESTAMP(3),
ADD COLUMN     "last_datacap_spent" TIMESTAMP(3);
