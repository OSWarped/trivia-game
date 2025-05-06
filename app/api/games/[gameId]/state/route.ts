// File: /app/api/games/[gameId]/state/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const url = new URL(req.url);
  const teamId = url.searchParams.get('teamId');

  if (!teamId) {
    return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
  }

  /* ── 1. basic team & TG lookup ─────────────────────────────────── */
  const teamGame = await prisma.teamGame.findUnique({
    where: { teamId_gameId: { teamId, gameId } },
    select: { team: { select: { name: true } } },
  });

  /* 2. on‑the‑fly score calc */
  const scoreAgg = await prisma.answer.aggregate({
    where: {
      teamGame: { teamId, gameId },
      isCorrect: true,
    },
    _sum: { awardedPoints: true },
  });
  const totalScore = scoreAgg._sum.awardedPoints ?? 0;

  /* ── 2. game‑level state ───────────────────────────────────────── */
  const gameState = await prisma.gameState.findUnique({
    where: { gameId },
    include: {
      game: { select: { id: true, status: true, rounds: true } },
    },
  });
  if (!gameState) {
    return NextResponse.json({ error: 'Game state not found' }, { status: 404 });
  }

  /* ── 3. current round / question ───────────────────────────────── */
  const currentRound = gameState.currentRoundId
    ? await prisma.round.findUnique({
        where: { id: gameState.currentRoundId },
      })
    : null;

  const currentQuestion = gameState.currentQuestionId
    ? await prisma.question.findUnique({
        where: { id: gameState.currentQuestionId },
        select: { id: true, text: true, type: true, options: true },
      })
    : null;

  /* submitted answer (if any) */
  const submittedAnswer = currentQuestion
  ? await prisma.answer.findFirst({
      where: {
        questionId: currentQuestion.id,
        teamGame: { teamId, gameId },
      },
      select: { given: true, awardedPoints: true },  // ← valid fields
    })
  : null;

  /* remaining POOL points */
  const pointsRemainingMap = gameState.pointsRemaining as Record<string, number[]>;
  const pointsRemaining = pointsRemainingMap?.[teamId] ?? [];

  /* ── 4. build DTO ──────────────────────────────────────────────── */
  return NextResponse.json({
    game: gameState.game, // { id, status }
    round: currentRound
      ? {
          id: currentRound.id,
          name: currentRound.name,
          roundType: currentRound.roundType,
          pointSystem: currentRound.pointSystem,
          pointPool: currentRound.pointPool,
          pointValue: currentRound.pointValue,
          wagerLimit: currentRound.wagerLimit,
        }
      : null,
    currentQuestion,
    team: {
      id: teamId,
      name: teamGame?.team.name,
      remainingPoints: pointsRemaining,
      submittedAnswer,
      score: totalScore,               // ← use totalPts
    },
  });
}
