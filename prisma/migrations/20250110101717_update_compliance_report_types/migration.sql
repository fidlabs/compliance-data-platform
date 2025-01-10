-- AlterTable
ALTER TABLE "compliance_report" ALTER COLUMN "clients_number" SET NOT NULL,
ALTER COLUMN "avg_retrievability_success_rate" SET DATA TYPE DOUBLE PRECISION;
