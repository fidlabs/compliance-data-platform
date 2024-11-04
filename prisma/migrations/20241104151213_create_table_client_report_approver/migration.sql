-- CreateTable
CREATE TABLE "client_report_approver" (
    "id" BIGSERIAL NOT NULL,
    "client_report_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "number" INTEGER NOT NULL,

    CONSTRAINT "client_report_approver_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "client_report_approver" ADD CONSTRAINT "client_report_approver_client_report_id_fkey" FOREIGN KEY ("client_report_id") REFERENCES "client_report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
