/*
  Warnings:

  - Added the required column `allocations` to the `old_datacap_balance_weekly` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "old_datacap_balance_weekly" ADD COLUMN     "allocations" BIGINT NOT NULL;
