/*
  Warnings:

  - You are about to drop the `Answer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PointPoolUsage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Question` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RoundQuestion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Subquestion` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `sortOrder` to the `Round` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Answer" DROP CONSTRAINT "Answer_questionId_fkey";

-- DropForeignKey
ALTER TABLE "Answer" DROP CONSTRAINT "Answer_subquestionId_fkey";

-- DropForeignKey
ALTER TABLE "Answer" DROP CONSTRAINT "Answer_teamId_fkey";

-- DropForeignKey
ALTER TABLE "PointPoolUsage" DROP CONSTRAINT "PointPoolUsage_roundId_fkey";

-- DropForeignKey
ALTER TABLE "PointPoolUsage" DROP CONSTRAINT "PointPoolUsage_teamId_fkey";

-- DropForeignKey
ALTER TABLE "RoundQuestion" DROP CONSTRAINT "RoundQuestion_questionId_fkey";

-- DropForeignKey
ALTER TABLE "RoundQuestion" DROP CONSTRAINT "RoundQuestion_roundId_fkey";

-- DropForeignKey
ALTER TABLE "Subquestion" DROP CONSTRAINT "Subquestion_questionId_fkey";

-- AlterTable
ALTER TABLE "Round" ADD COLUMN     "pointValue" INTEGER,
ADD COLUMN     "sortOrder" INTEGER NOT NULL;

-- DropTable
DROP TABLE "Answer";

-- DropTable
DROP TABLE "PointPoolUsage";

-- DropTable
DROP TABLE "Question";

-- DropTable
DROP TABLE "RoundQuestion";

-- DropTable
DROP TABLE "Subquestion";
