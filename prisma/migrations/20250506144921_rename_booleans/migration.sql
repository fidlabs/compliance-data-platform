/*
  Warnings:

  - You are about to drop the column `client_contract` on the `allocator_report_client` table. All the data in the column will be lost.
  - You are about to drop the column `client_contract` on the `client_report` table. All the data in the column will be lost.
  - You are about to drop the column `public_dataset` on the `client_report` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "allocator_report_client" DROP COLUMN "client_contract",
ADD COLUMN     "using_client_contract" BOOLEAN;

-- AlterTable
ALTER TABLE "client_report" DROP COLUMN "client_contract",
DROP COLUMN "public_dataset",
ADD COLUMN     "is_public_dataset" BOOLEAN,
ADD COLUMN     "using_client_contract" BOOLEAN;
