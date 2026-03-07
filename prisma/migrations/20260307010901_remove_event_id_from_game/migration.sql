/*
  Warnings:

  - You are about to drop the column `eventId` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `recurring` on the `Season` table. All the data in the column will be lost.
  - Made the column `seasonId` on table `Game` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Game" DROP CONSTRAINT "Game_eventId_fkey";

-- DropForeignKey
ALTER TABLE "Game" DROP CONSTRAINT "Game_seasonId_fkey";

-- AlterTable
ALTER TABLE "Game" DROP COLUMN "eventId",
ALTER COLUMN "seasonId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Season" DROP COLUMN "recurring";

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
