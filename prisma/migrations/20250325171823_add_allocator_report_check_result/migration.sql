-- CreateEnum
CREATE TYPE "AllocatorReportCheck" AS ENUM ('CLIENT_MULTIPLE_ALLOCATORS');

-- CreateTable
CREATE TABLE "allocator_report_check_result" (
    "id" UUID NOT NULL,
    "create_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" BOOLEAN,
    "check" "AllocatorReportCheck" NOT NULL,
    "allocator_report_id" UUID NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "allocator_report_check_result_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "allocator_report_check_result_check_allocator_report_id_key" ON "allocator_report_check_result"("check", "allocator_report_id");

-- AddForeignKey
ALTER TABLE "allocator_report_check_result" ADD CONSTRAINT "allocator_report_check_result_allocator_report_id_fkey" FOREIGN KEY ("allocator_report_id") REFERENCES "allocator_report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
