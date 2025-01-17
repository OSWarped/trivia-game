import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  try {
    // Fetch the game along with rounds and their questions
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        rounds: {
          orderBy: {
            sortOrder: 'asc', // Ensure rounds are ordered by sortOrder in ascending order
          },
          include: {
            questions: true, // Include the questions for each round
          },
        },
      },
    });
    

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Game has already been completed' }, { status: 400 });
    }

    // Fetch the first round and its first question
    const firstRound = game.rounds[0];
    const firstQuestion = firstRound?.questions[0] || null;

    // Create or update GameState
    await prisma.gameState.upsert({
      where: { gameId },
      update: {
        currentRoundId: firstRound?.id || null,
        currentQuestionId: firstQuestion?.id || null,
      },
      create: {
        gameId,
        currentRoundId: firstRound?.id || null,
        currentQuestionId: firstQuestion?.id || null,
      },
    });

    // Update game status to STARTED
    await prisma.game.update({
      where: { id: gameId },
      data: { status: 'COMPLETED', startedAt: new Date() },
    });

    return NextResponse.json({ message: 'Game started successfully!' });
  } catch (error) {
    console.error('Error starting game:', error);
    return NextResponse.json({ error: 'Failed to start game' }, { status: 500 });
  }
}
