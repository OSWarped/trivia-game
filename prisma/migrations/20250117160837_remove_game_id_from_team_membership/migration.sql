/*
  Warnings:

  - You are about to drop the column `gameId` on the `TeamMembership` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `TeamMembership` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "TeamMembership_userId_gameId_key";

-- AlterTable
ALTER TABLE "TeamMembership" DROP COLUMN "gameId";

-- CreateIndex
CREATE UNIQUE INDEX "TeamMembership_userId_key" ON "TeamMembership"("userId");
