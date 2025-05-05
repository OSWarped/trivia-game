-- CreateTable
CREATE TABLE "GameState" (
    "gameId" TEXT NOT NULL,
    "currentRoundId" TEXT,
    "currentQuestionId" TEXT,
    "pointsRemaining" JSONB NOT NULL,
    "questionStartedAt" TIMESTAMP(3),
    "isAcceptingAnswers" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameState_pkey" PRIMARY KEY ("gameId")
);

-- AddForeignKey
ALTER TABLE "GameState" ADD CONSTRAINT "GameState_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
