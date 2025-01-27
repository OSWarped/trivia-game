/*
  Warnings:

  - You are about to drop the column `pointsAwarded` on the `Subquestion` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Subquestion" DROP COLUMN "pointsAwarded";

-- CreateTable
CREATE TABLE "SubQuestionAnswer" (
    "id" TEXT NOT NULL,
    "subquestionId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "pointsAwarded" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubQuestionAnswer_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SubQuestionAnswer" ADD CONSTRAINT "SubQuestionAnswer_subquestionId_fkey" FOREIGN KEY ("subquestionId") REFERENCES "Subquestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubQuestionAnswer" ADD CONSTRAINT "SubQuestionAnswer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
