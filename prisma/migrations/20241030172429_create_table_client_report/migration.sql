-- CreateTable
CREATE TABLE "client_report" (
    "id" SERIAL NOT NULL,
    "create_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "client" TEXT NOT NULL,
    "client_address" TEXT NOT NULL,
    "organization_name" TEXT NOT NULL,

    CONSTRAINT "client_report_pkey" PRIMARY KEY ("id")
);
