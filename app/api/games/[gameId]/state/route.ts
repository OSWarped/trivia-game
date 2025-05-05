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

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { name: true },
  });
  
  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  }

  const gameState = await prisma.gameState.findUnique({
    where: { gameId },
    include: {
      game: {
        include: { rounds: true },
      },
    },
  });

  if (!gameState) {
    return NextResponse.json({ error: 'Game state not found' }, { status: 404 });
  }

  const currentRound = gameState.currentRoundId
    ? await prisma.round.findUnique({
      where: { id: gameState.currentRoundId },
    })
    : null;

  const currentQuestion = gameState.currentQuestionId
    ? await prisma.question.findUnique({
      where: { id: gameState.currentQuestionId },
    })
    : null;

  const submittedAnswer = currentQuestion
    ? await prisma.answer.findFirst({
      where: {
        questionId: currentQuestion.id,
        teamGame: {
          teamId,
        },
      },
    })
    : null;

  // Fetch all scored answers for this team and game
  const scoredAnswers = await prisma.answer.findMany({
    where: {
      teamGame: {
        teamId,
      },
      isCorrect: true,
    },
    select: {
      awardedPoints: true,
    },
  });

  // Sum the awardedPoints
  const totalScore = scoredAnswers.reduce((sum, a) => sum + (a.awardedPoints || 0), 0);

  const pointsRemainingMap = gameState.pointsRemaining as Record<string, number[]>;
  const pointsRemaining = pointsRemainingMap?.[teamId] ?? [];

  return NextResponse.json({
    game: {
      id: gameState.game.id,
      status: gameState.game.status,
    },
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
    currentQuestion: currentQuestion
      ? {
        id: currentQuestion.id,
        text: currentQuestion.text,
        type: currentQuestion.type,
      }
      : null,
    team: {
      id: teamId,
      name: team.name,
      remainingPoints: pointsRemaining,
      submittedAnswer,
      score: totalScore,
    },
  });
}
