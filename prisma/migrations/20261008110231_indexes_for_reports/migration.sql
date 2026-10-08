-- CreateIndex
CREATE INDEX "allocator_report_address_create_date_idx" ON "allocator_report"("address", "create_date");

-- CreateIndex
CREATE INDEX "allocator_report_client_allocator_report_id_client_id_idx" ON "allocator_report_client"("allocator_report_id", "client_id");

-- CreateIndex
CREATE INDEX "allocator_report_client_cid_sharing_client_id_idx" ON "allocator_report_client_cid_sharing"("allocator_report_clientId");

-- CreateIndex
CREATE INDEX "allocator_report_scoring_result_allocator_report_id_idx" ON "allocator_report_scoring_result"("allocator_report_id");

-- CreateIndex
CREATE INDEX "allocator_report_scoring_result_range_scoring_result_id_idx" ON "allocator_report_scoring_result_range"("scoring_result_id");

-- CreateIndex
CREATE INDEX "allocator_report_sp_dist_report_datacap_idx" ON "allocator_report_storage_provider_distribution"("allocator_report_id", "perc_of_total_datacap" DESC);

-- CreateIndex
CREATE INDEX "client_report_client_create_date_idx" ON "client_report"("client", "create_date");

-- CreateIndex
CREATE INDEX "client_report_client_address_create_date_idx" ON "client_report"("client_address", "create_date");

-- CreateIndex
CREATE INDEX "client_report_check_result_create_date_client_report_result_idx" ON "client_report_check_result"("create_date", "client_report_id", "result");

-- CreateIndex
CREATE INDEX "client_report_cid_sharing_client_report_id_idx" ON "client_report_cid_sharing"("client_report_id");
