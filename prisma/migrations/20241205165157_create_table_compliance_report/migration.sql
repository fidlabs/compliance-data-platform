-- CreateTable
CREATE TABLE "compliance_report" (
    "id" UUID NOT NULL,
    "create_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "allocator" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "filecoin_pulse" TEXT NOT NULL,
    "clients_number" INTEGER,
    "multisig" BOOLEAN NOT NULL,
    "avg_retrievability_success_rate" DECIMAL(5,2),
    "avg_time_to_first_deal" DECIMAL(5,2),

    CONSTRAINT "compliance_report_pkey" PRIMARY KEY ("id")
);
