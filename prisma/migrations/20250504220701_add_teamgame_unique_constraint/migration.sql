/*
  Warnings:

  - A unique constraint covering the columns `[teamId,gameId]` on the table `TeamGame` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "TeamGame_gameId_teamId_key";

-- CreateIndex
CREATE UNIQUE INDEX "TeamGame_teamId_gameId_key" ON "TeamGame"("teamId", "gameId");
