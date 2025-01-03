/*
  Warnings:

  - You are about to drop the column `playerId` on the `Answer` table. All the data in the column will be lost.
  - You are about to drop the column `wagerPoints` on the `Answer` table. All the data in the column will be lost.
  - Added the required column `teamId` to the `Answer` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Answer" DROP CONSTRAINT "Answer_playerId_fkey";

-- AlterTable
ALTER TABLE "Answer" DROP COLUMN "playerId",
DROP COLUMN "wagerPoints",
ADD COLUMN     "subquestionId" TEXT,
ADD COLUMN     "teamId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Subquestion" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subquestion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Subquestion" ADD CONSTRAINT "Subquestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_subquestionId_fkey" FOREIGN KEY ("subquestionId") REFERENCES "Subquestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
