/*
  Warnings:

  - A unique constraint covering the columns `[gameId,hostId]` on the table `HostGame` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "HostGame_gameId_hostId_key" ON "HostGame"("gameId", "hostId");
