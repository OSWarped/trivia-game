import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  try {
    // Fetch the game along with rounds, questions, subquestions, and teams
const game = await prisma.game.findUnique({
  where: { id: gameId },
  include: {
    rounds: {
      orderBy: {
        sortOrder: 'asc', // Ensure rounds are ordered by sortOrder in ascending order
      },
      include: {
        questions: {
          include: {
            subquestions: {
              include: {
                correctAnswer: true, // Include the correct answer for each subquestion
              },
            },
          },
        }, // Include the questions for each round
      },
    },
    teamGames: {
      include: {
        team: true, // Include teams associated with the game
      },
    },
  },
});


    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'PENDING') {
      return NextResponse.json({ error: 'Game has already started or completed' }, { status: 400 });
    }

    // Fetch the first round and its first question
    const firstRound = game.rounds[0];
    const firstQuestion = firstRound?.questions[0] || null;

    // Initialize pointsRemaining for POOL type rounds
    let pointsRemaining: Record<string, number[]> = {};
    if (firstRound && firstRound.pointSystem === 'POOL') {
      const pointPool = firstRound.pointPool || [];
      if (pointPool.length === 0) {
        return NextResponse.json(
          { error: 'First round is POOL type but has no point pool defined.' },
          { status: 400 }
        );
      }

      // Set the same pointPool for all teams in the game
      pointsRemaining = game.teamGames.reduce((acc, teamGame) => {
        acc[teamGame.team.id] = [...pointPool]; // Clone the pointPool for each team
        return acc;
      }, {} as Record<string, number[]>);
    }

    // Create or update GameState
    await prisma.gameState.upsert({
      where: { gameId },
      update: {
        currentRoundId: firstRound?.id || null,
        currentQuestionId: firstQuestion?.id || null,
        pointsRemaining, // Update pointsRemaining
      },
      create: {
        gameId,
        currentRoundId: firstRound?.id || null,
        currentQuestionId: firstQuestion?.id || null,
        pointsRemaining, // Initialize pointsRemaining
      },
    });

    // Update game status to STARTED
    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
      include: {
        hostingSite: true, // Include hosting site details
        teamGames: {
          include: {
            team: true, // Include teams associated with the game
          },
        },
      },
    });

    // Build the response payload
    const responsePayload = {
      id: updatedGame.id,
      name: updatedGame.name,
      status: updatedGame.status,
      date: updatedGame.date,
      hostingSite: {
        id: updatedGame.hostingSite.id,
        name: updatedGame.hostingSite.name,
        location: updatedGame.hostingSite.location,
      },
      teams: updatedGame.teamGames.map((teamGame) => ({
        id: teamGame.team.id,
        name: teamGame.team.name,
      })),
      message: 'Game started successfully!',
    };

    return NextResponse.json(responsePayload);

  } catch (error) {
    console.error('Error starting game:', error);
    return NextResponse.json({ error: 'Failed to start game' }, { status: 500 });
  }
}
