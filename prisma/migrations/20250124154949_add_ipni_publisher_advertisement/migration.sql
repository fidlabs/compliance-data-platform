-- CreateTable
CREATE TABLE "ipni_publisher_advertisement" (
    "id" TEXT NOT NULL,
    "previous_id" TEXT,
    "publisher_id" TEXT NOT NULL,
    "context_id" TEXT NOT NULL,
    "entries_number" BIGINT NOT NULL,
    "is_rm" BOOLEAN NOT NULL,

    CONSTRAINT "ipni_publisher_advertisement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ipni_publisher_advertisement_previous_id_key" ON "ipni_publisher_advertisement"("previous_id");
