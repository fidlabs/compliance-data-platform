/*
  Warnings:

  - You are about to drop the column `first_allocation` on the `compliance_report_client_allocation` table. All the data in the column will be lost.
  - You are about to drop the column `remaining_allocation` on the `compliance_report_client_allocation` table. All the data in the column will be lost.
  - You are about to drop the column `second_allocation` on the `compliance_report_client_allocation` table. All the data in the column will be lost.
  - You are about to drop the column `third_allocation` on the `compliance_report_client_allocation` table. All the data in the column will be lost.
  - Added the required column `allocation` to the `compliance_report_client_allocation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `timestamp` to the `compliance_report_client_allocation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "compliance_report_client_allocation" DROP COLUMN "first_allocation",
DROP COLUMN "remaining_allocation",
DROP COLUMN "second_allocation",
DROP COLUMN "third_allocation",
ADD COLUMN     "allocation" BIGINT NOT NULL,
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL;
