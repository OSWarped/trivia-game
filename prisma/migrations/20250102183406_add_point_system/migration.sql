/*
  Warnings:

  - Added the required column `pointSystem` to the `Round` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PointSystem" AS ENUM ('POOL', 'FLAT');

-- AlterTable
ALTER TABLE "Round" ADD COLUMN     "pointSystem" "PointSystem" NOT NULL;

-- CreateTable
CREATE TABLE "PointPoolUsage" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "pointValue" INTEGER NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointPoolUsage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PointPoolUsage" ADD CONSTRAINT "PointPoolUsage_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointPoolUsage" ADD CONSTRAINT "PointPoolUsage_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
