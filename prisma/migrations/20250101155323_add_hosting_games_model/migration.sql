-- CreateTable
CREATE TABLE "HostGame" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostGame_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "HostGame" ADD CONSTRAINT "HostGame_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostGame" ADD CONSTRAINT "HostGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
