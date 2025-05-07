import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { gameId, questionId, answer, pointsUsed, teamId } = await req.json();

    if (!teamId || !gameId || !questionId || !answer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Ensure question exists
    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) {
      return NextResponse.json({ error: 'Invalid question ID' }, { status: 400 });
    }

    // Lookup TeamGame
    const teamGame = await prisma.teamGame.findUnique({
      where: {
        teamId_gameId: {
          teamId,
          gameId,
        },
      },
    });

    if (!teamGame) {
      return NextResponse.json({ error: 'Team not part of this game' }, { status: 404 });
    }

    // Prevent duplicate submission
    const existing = await prisma.answer.findFirst({
      where: {
        teamGameId: teamGame.id,
        questionId,
      },
    });
    if (existing) {
      return NextResponse.json({ error: 'Already submitted' }, { status: 400 });
    }

    // Save the answer
    await prisma.answer.create({
      data: {
        teamGameId: teamGame.id,
        questionId,
        given: typeof answer === 'string' ? answer : JSON.stringify(answer),
        isCorrect: null,
        awardedPoints: 0,
        pointsUsed,
      },
    });

    /* ---- update GameState.pointsRemaining for POOL rounds ------------ */
if (typeof pointsUsed === 'number') {
  const gameState = await prisma.gameState.findUnique({ where: { gameId } });

  if (gameState?.pointsRemaining) {
    const map = gameState.pointsRemaining as Record<string, number[]>;

    /* current pool for this team */
    const pool = map[teamId] ?? [];

    /* remove ONE occurrence of the chip */
    const idx = pool.indexOf(pointsUsed);
    if (idx !== -1) {
      pool.splice(idx, 1);        // mutate the array
      map[teamId] = pool;

      await prisma.gameState.update({
        where: { gameId },
        data: { pointsRemaining: map },
      });
    }
  }
}


    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error in POST /api/play/answers:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
