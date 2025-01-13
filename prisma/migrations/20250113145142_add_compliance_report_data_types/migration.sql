-- AlterTable
ALTER TABLE "compliance_report" ADD COLUMN     "data_types" TEXT[],
ADD COLUMN     "required_copies" TEXT,
ADD COLUMN     "required_sps" TEXT;
