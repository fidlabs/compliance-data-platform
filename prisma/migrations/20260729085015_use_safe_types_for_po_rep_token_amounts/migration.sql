-- AlterTable
ALTER TABLE "filecoin_pay_payment" ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "netPayeeAmount" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "operatorCommission" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "networkFee" SET DATA TYPE DECIMAL(78,0);

-- AlterTable
ALTER TABLE "filecoin_pay_rail" ALTER COLUMN "paymentRate" SET DEFAULT 0,
ALTER COLUMN "paymentRate" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "lockupFixed" SET DEFAULT 0,
ALTER COLUMN "lockupFixed" SET DATA TYPE DECIMAL(78,0);

-- AlterTable
ALTER TABLE "po_rep_deal_terms" ALTER COLUMN "price_per_sector_per_month" SET DATA TYPE DECIMAL(78,0);

-- AlterTable
ALTER TABLE "po_rep_storage_provider" ALTER COLUMN "pricePerSectorPerMonth" SET DEFAULT 0,
ALTER COLUMN "pricePerSectorPerMonth" SET DATA TYPE DECIMAL(78,0);
