/*
  Warnings:

  - The `score` column on the `allocator_report_scoring_results` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "allocator_report_scoring_results" DROP COLUMN "score",
ADD COLUMN     "score" INTEGER;
