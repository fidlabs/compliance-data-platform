/*
  Warnings:

  - Added the required column `metricDescription` to the `allocator_report_scoring_results` table without a default value. This is not possible if the table is not empty.
  - Added the required column `metricName` to the `allocator_report_scoring_results` table without a default value. This is not possible if the table is not empty.
  - Made the column `score` on table `allocator_report_scoring_results` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "allocator_report_scoring_results" ADD COLUMN     "metricDescription" TEXT NOT NULL,
ADD COLUMN     "metricName" TEXT NOT NULL,
ALTER COLUMN "score" SET NOT NULL;
