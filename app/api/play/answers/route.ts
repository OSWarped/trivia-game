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
      },
    });

    // Update GameState.pointsRemaining if applicable
    if (pointsUsed && Array.isArray(pointsUsed)) {
      const gameState = await prisma.gameState.findUnique({
        where: { gameId },
      });

      if (gameState?.pointsRemaining) {
        const parsed = gameState.pointsRemaining as Record<string, number[]>;
        const remaining = parsed[teamId]?.filter(p => !pointsUsed.includes(p)) || [];

        parsed[teamId] = remaining;

        await prisma.gameState.update({
          where: { gameId },
          data: {
            pointsRemaining: parsed,
          },
        });
      }
    }  

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error in POST /api/play/answers:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
