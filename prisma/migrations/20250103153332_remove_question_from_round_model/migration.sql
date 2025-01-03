/*
  Warnings:

  - You are about to drop the column `roundId` on the `Question` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_roundId_fkey";

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "roundId";
