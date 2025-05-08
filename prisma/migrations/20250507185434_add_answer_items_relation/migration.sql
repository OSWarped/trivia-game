-- CreateTable
CREATE TABLE "AnswerItem" (
    "id" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "submitted" TEXT NOT NULL,
    "isCorrect" BOOLEAN,
    "awarded" INTEGER NOT NULL,

    CONSTRAINT "AnswerItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AnswerItem" ADD CONSTRAINT "AnswerItem_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
