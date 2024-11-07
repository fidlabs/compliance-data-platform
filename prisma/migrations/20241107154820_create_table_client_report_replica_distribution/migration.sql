-- CreateTable
CREATE TABLE "client_report_replica_distribution" (
    "id" BIGSERIAL NOT NULL,
    "client_report_id" BIGINT NOT NULL,
    "num_of_replicas" BIGINT NOT NULL,
    "total_deal_size" BIGINT NOT NULL,
    "unique_data_size" BIGINT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "client_report_replica_distribution_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "client_report_replica_distribution" ADD CONSTRAINT "client_report_replica_distribution_client_report_id_fkey" FOREIGN KEY ("client_report_id") REFERENCES "client_report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
