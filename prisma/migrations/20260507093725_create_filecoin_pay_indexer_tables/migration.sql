-- CreateTable
CREATE TABLE "filecoin_pay_rail" (
    "railId" BIGINT NOT NULL,
    "token" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "validator" TEXT NOT NULL,
    "paymentRate" BIGINT NOT NULL DEFAULT 0,
    "lockupPeriod" BIGINT NOT NULL DEFAULT 0,
    "lockupFixed" BIGINT NOT NULL DEFAULT 0,
    "settledUpTo" BIGINT NOT NULL,
    "endEpoch" BIGINT NOT NULL DEFAULT 0,
    "commissionRateBps" INTEGER NOT NULL,
    "serviceFeeRecipient" TEXT NOT NULL,
    "finalized" BOOLEAN NOT NULL DEFAULT false,
    "createdAtBlock" BIGINT NOT NULL,

    CONSTRAINT "filecoin_pay_rail_pkey" PRIMARY KEY ("railId")
);

-- CreateTable
CREATE TABLE "filecoin_pay_payment" (
    "id" UUID NOT NULL,
    "railId" BIGINT NOT NULL,
    "totalAmount" BIGINT NOT NULL,
    "netPayeeAmount" BIGINT NOT NULL,
    "operatorCommission" BIGINT NOT NULL,
    "networkFee" BIGINT NOT NULL,
    "createdAtBlock" BIGINT NOT NULL,
    "oneTime" BOOLEAN NOT NULL,

    CONSTRAINT "filecoin_pay_payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "filecoin_pay_rail_createdAtBlock_idx" ON "filecoin_pay_rail"("createdAtBlock" DESC);

-- CreateIndex
CREATE INDEX "filecoin_pay_payment_railId_createdAtBlock_idx" ON "filecoin_pay_payment"("railId", "createdAtBlock" DESC);
