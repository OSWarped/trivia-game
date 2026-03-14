/*
  Warnings:

  - A unique constraint covering the columns `[siteId,normalizedName]` on the table `Team` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `normalizedName` to the `Team` table without a default value. This is not possible if the table is not empty.
  - Added the required column `siteId` to the `Team` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Team_name_pin_key";

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "normalizedName" TEXT NOT NULL,
ADD COLUMN     "siteId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Team_siteId_idx" ON "Team"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_siteId_normalizedName_key" ON "Team"("siteId", "normalizedName");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
