-- CreateTable
CREATE TABLE "compliance_report_client_allocation" (
    "id" UUID NOT NULL,
    "compliance_report_id" UUID NOT NULL,
    "client_id" TEXT NOT NULL,
    "first_allocation" BIGINT,
    "second_allocation" BIGINT,
    "third_allocation" BIGINT,
    "remaining_allocation" BIGINT,

    CONSTRAINT "compliance_report_client_allocation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "compliance_report_client_allocation" ADD CONSTRAINT "compliance_report_client_allocation_compliance_report_id_fkey" FOREIGN KEY ("compliance_report_id") REFERENCES "compliance_report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
