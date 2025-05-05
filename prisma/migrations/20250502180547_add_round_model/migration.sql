-- CreateEnum
CREATE TYPE "RoundType" AS ENUM ('POINT_BASED', 'TIME_BASED', 'WAGER', 'LIGHTNING', 'IMAGE');

-- CreateEnum
CREATE TYPE "PointSystem" AS ENUM ('POOL', 'FLAT');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "roundId" TEXT;

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "roundType" "RoundType" NOT NULL,
    "pointSystem" "PointSystem" NOT NULL,
    "maxPoints" INTEGER,
    "pointValue" INTEGER,
    "pointPool" INTEGER[],
    "timeLimit" INTEGER,
    "wagerLimit" INTEGER,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
