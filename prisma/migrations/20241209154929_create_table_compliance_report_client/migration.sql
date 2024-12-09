-- CreateTable
CREATE TABLE "compliance_report_client" (
    "id" UUID NOT NULL,
    "compliance_report_id" UUID NOT NULL,
    "client_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "allocations_number" INTEGER NOT NULL,
    "total_allocations" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "compliance_report_client_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "compliance_report_client" ADD CONSTRAINT "compliance_report_client_compliance_report_id_fkey" FOREIGN KEY ("compliance_report_id") REFERENCES "compliance_report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
