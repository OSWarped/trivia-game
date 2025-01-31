-- CreateTable
CREATE TABLE "LobbySession" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "captainId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LobbySession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LobbySession_captainId_key" ON "LobbySession"("captainId");

-- CreateIndex
CREATE UNIQUE INDEX "LobbySession_gameId_captainId_key" ON "LobbySession"("gameId", "captainId");

-- AddForeignKey
ALTER TABLE "LobbySession" ADD CONSTRAINT "LobbySession_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LobbySession" ADD CONSTRAINT "LobbySession_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
