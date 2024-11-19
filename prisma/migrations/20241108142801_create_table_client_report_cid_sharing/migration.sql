-- CreateTable
CREATE TABLE "client_report_cid_sharing" (
    "id" BIGSERIAL NOT NULL,
    "client_report_id" BIGINT NOT NULL,
    "other_client" TEXT NOT NULL,
    "total_deal_size" BIGINT NOT NULL,
    "unique_cid_count" INTEGER NOT NULL,

    CONSTRAINT "client_report_cid_sharing_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "client_report_cid_sharing" ADD CONSTRAINT "client_report_cid_sharing_client_report_id_fkey" FOREIGN KEY ("client_report_id") REFERENCES "client_report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
