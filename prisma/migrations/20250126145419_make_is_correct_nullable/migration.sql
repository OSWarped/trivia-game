-- AlterTable
ALTER TABLE "Answer" ALTER COLUMN "isCorrect" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SubQuestionAnswer" ALTER COLUMN "isCorrect" DROP NOT NULL;
