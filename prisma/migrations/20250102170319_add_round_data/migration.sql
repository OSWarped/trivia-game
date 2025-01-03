/*
  Warnings:

  - A unique constraint covering the columns `[roundId,pointValue]` on the table `RoundQuestion` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `Round` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `RoundQuestion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Round" ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "RoundQuestion" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "RoundQuestion_roundId_pointValue_key" ON "RoundQuestion"("roundId", "pointValue");
