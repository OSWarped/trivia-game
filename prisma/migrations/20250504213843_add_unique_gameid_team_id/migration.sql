/*
  Warnings:

  - A unique constraint covering the columns `[gameId,teamId]` on the table `TeamGame` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "TeamGame_gameId_teamId_key" ON "TeamGame"("gameId", "teamId");
