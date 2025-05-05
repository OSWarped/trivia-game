/*
  Warnings:

  - You are about to drop the column `gameId` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `points` on the `Question` table. All the data in the column will be lost.
  - Made the column `roundId` on table `Question` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_gameId_fkey";

-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_roundId_fkey";

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "gameId",
DROP COLUMN "points",
ALTER COLUMN "roundId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
