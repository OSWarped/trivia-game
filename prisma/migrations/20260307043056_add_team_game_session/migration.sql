-- CreateEnum
CREATE TYPE "TeamGameSessionStatus" AS ENUM ('ACTIVE', 'RECONNECTING', 'OFFLINE', 'CLOSED');

-- AlterTable
ALTER TABLE "Team" ALTER COLUMN "pin" DROP NOT NULL;

-- CreateTable
CREATE TABLE "TeamGameSession" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "status" "TeamGameSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "socketId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamGameSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamGameSession_sessionToken_key" ON "TeamGameSession"("sessionToken");

-- CreateIndex
CREATE INDEX "TeamGameSession_gameId_idx" ON "TeamGameSession"("gameId");

-- CreateIndex
CREATE INDEX "TeamGameSession_teamId_idx" ON "TeamGameSession"("teamId");

-- CreateIndex
CREATE INDEX "TeamGameSession_status_idx" ON "TeamGameSession"("status");

-- CreateIndex
CREATE INDEX "TeamGameSession_expiresAt_idx" ON "TeamGameSession"("expiresAt");

-- CreateIndex
CREATE INDEX "TeamGameSession_gameId_teamId_idx" ON "TeamGameSession"("gameId", "teamId");

-- AddForeignKey
ALTER TABLE "TeamGameSession" ADD CONSTRAINT "TeamGameSession_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamGameSession" ADD CONSTRAINT "TeamGameSession_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
