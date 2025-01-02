/*
  Warnings:

  - You are about to drop the column `name` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `maxWagerLimit` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the `SiteRole` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `roundType` to the `Round` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "GameMode" AS ENUM ('TIME_BASED', 'POINT_ASSIGNMENT', 'COMBO');

-- CreateEnum
CREATE TYPE "RoundType" AS ENUM ('POINT_BASED', 'TIME_BASED', 'WAGER', 'LIGHTNING', 'IMAGE');

-- AlterEnum
ALTER TYPE "QuestionType" ADD VALUE 'IMAGE';

-- DropForeignKey
ALTER TABLE "Game" DROP CONSTRAINT "Game_hostingSiteId_fkey";

-- DropForeignKey
ALTER TABLE "SiteRole" DROP CONSTRAINT "SiteRole_siteId_fkey";

-- DropForeignKey
ALTER TABLE "SiteRole" DROP CONSTRAINT "SiteRole_userId_fkey";

-- AlterTable
ALTER TABLE "Game" DROP COLUMN "name";

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "maxWagerLimit",
ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "Round" ADD COLUMN     "maxPoints" INTEGER,
ADD COLUMN     "roundType" "RoundType" NOT NULL,
ADD COLUMN     "timeLimit" INTEGER,
ADD COLUMN     "wagerLimit" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "roles" TEXT[];

-- DropTable
DROP TABLE "SiteRole";

-- CreateTable
CREATE TABLE "RoundQuestion" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "pointValue" INTEGER NOT NULL,

    CONSTRAINT "RoundQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "answer" JSONB NOT NULL,
    "pointValue" INTEGER NOT NULL,
    "timeTaken" INTEGER,
    "wagerPoints" INTEGER,
    "isCorrect" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_hostingSiteId_fkey" FOREIGN KEY ("hostingSiteId") REFERENCES "HostingSite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundQuestion" ADD CONSTRAINT "RoundQuestion_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundQuestion" ADD CONSTRAINT "RoundQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
