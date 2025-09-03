-- CreateTable
CREATE TABLE "allocator_report_client_cid_sharing" (
    "id" BIGSERIAL NOT NULL,
    "allocator_report_clientId" UUID,
    "other_client" TEXT NOT NULL,
    "other_client_application_url" TEXT,
    "total_deal_size" BIGINT NOT NULL,
    "unique_cid_count" INTEGER NOT NULL,

    CONSTRAINT "allocator_report_client_cid_sharing_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "allocator_report_client_cid_sharing" ADD CONSTRAINT "allocator_report_client_cid_sharing_allocator_report_clien_fkey" FOREIGN KEY ("allocator_report_clientId") REFERENCES "allocator_report_client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
