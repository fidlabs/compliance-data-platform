-- CreateTable
CREATE TABLE "client" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "address" TEXT,
    "github_url" TEXT,
    "datacap_received" BIGINT NOT NULL,
    "datacap_remaining" BIGINT NOT NULL,
    "datacap_used_2_weeks" BIGINT NOT NULL,
    "datacap_used_90_days" BIGINT NOT NULL,

    CONSTRAINT "client_pkey" PRIMARY KEY ("id")
);
