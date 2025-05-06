import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  /* current game state */
  const gs = await prisma.gameState.findUnique({ where: { gameId } });
  if (!gs || !gs.currentQuestionId) {
    return NextResponse.json({ error: 'No active question' }, { status: 400 });
  }

  /* find all questions in order */
  const questions = await prisma.question.findMany({
    where: { round: { gameId } },
    select: { id: true, roundId: true, sortOrder: true },
    orderBy: [{ round: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
  });

  /* locate index of current */
  const idx = questions.findIndex((q) => q.id === gs.currentQuestionId);
  const next = questions[idx + 1];
  if (!next) {
    return NextResponse.json({ error: 'Already at last question' }, { status: 400 });
  }

  /* update GameState */
  await prisma.gameState.update({
    where: { gameId },
    data: {
      currentQuestionId: next.id,
      currentRoundId: next.roundId,
      questionStartedAt: new Date(),
      isAcceptingAnswers: true,
    },
  });

  return NextResponse.json({
    currentQuestionId: next.id,
    currentRoundId: next.roundId,
  });
}
