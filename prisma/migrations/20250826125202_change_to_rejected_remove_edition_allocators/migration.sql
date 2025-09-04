/*
  Warnings:

  - You are about to drop the column `active` on the `allocator_registry` table. All the data in the column will be lost.
  - You are about to drop the column `program_round` on the `allocator_registry` table. All the data in the column will be lost.
  - You are about to drop the column `active` on the `allocator_registry_archive` table. All the data in the column will be lost.
  - You are about to drop the column `program_round` on the `allocator_registry_archive` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "allocator_registry" DROP COLUMN "active",
DROP COLUMN "program_round",
ADD COLUMN     "rejected" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "allocator_registry_archive" DROP COLUMN "active",
DROP COLUMN "program_round",
ADD COLUMN     "rejected" BOOLEAN NOT NULL DEFAULT false;
