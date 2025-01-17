import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type PointsRemaining = Record<string, number[]>;


// GET: Fetch the current state of the game
export async function GET(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  try {
    // Fetch the game and its current state
    const gameState = await prisma.gameState.findUnique({
      where: { gameId },
      include: {
        game: {
          include: {
            teamGames: {
              include: {
                team: {
                  include: {
                    memberships: {
                      include: {
                        user: true, // Include user details through memberships
                      },
                    },
                  },
                },
              },
            },
            rounds: {
              include: { questions: true },
            },
          },
        },
      },
    });
  
    if (!gameState) {
      return NextResponse.json({ error: 'Game state not found' }, { status: 404 });
    }
  
    const currentRound = gameState.currentRoundId
      ? gameState.game.rounds.find((round) => round.id === gameState.currentRoundId)
      : null;
  
    const currentQuestion = gameState.currentQuestionId
      ? currentRound?.questions.find((question) => question.id === gameState.currentQuestionId)
      : null;
  
    return NextResponse.json({
      game: {
        id: gameState.game.id,
        name: gameState.game.name,
        status: gameState.game.status,
        currentRound: currentRound
          ? {
              id: currentRound.id,
              name: currentRound.name,
              pointPool: currentRound.pointPool,
              roundType: currentRound.roundType,
              pointSystem: currentRound.pointSystem,
              pointValue: currentRound.pointValue,
              maxPoints: currentRound.maxPoints,
            }
          : null,
        currentQuestion: currentQuestion
          ? {
              id: currentQuestion.id,
              text: currentQuestion.text,
            }
          : null,
      },
      teams: gameState.game.teamGames.map((teamGame) => {
        // Cast pointsRemaining to the defined type
        const pointsRemaining = (gameState.pointsRemaining as PointsRemaining)[teamGame.team.id]
          ? (gameState.pointsRemaining as PointsRemaining)[teamGame.team.id]
          : currentRound?.pointPool || [];
      
        return {
          id: teamGame.team.id,
          name: teamGame.team.name,
          players: teamGame.team.memberships.map((membership) => ({
            id: membership.user.id,
            name: membership.user.name,
          })),
          remainingPoints: pointsRemaining,
        };
      }), // Fixed missing closing parenthesis
    });
  } catch (error) {
    console.error('Error fetching game state:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game state' },
      { status: 500 }
    );
  }
  
}

// POST: Submit an answer for the team
export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const body = await req.json();
  const { teamId, questionId, answer, pointsUsed } = body;

  if (!teamId || !questionId || !answer || pointsUsed === undefined) {
    return NextResponse.json(
      { error: 'Missing required fields: teamId, questionId, answer, or pointsUsed' },
      { status: 400 }
    );
  }

  try {
    const gameState = await prisma.gameState.findUnique({ where: { gameId } });

    if (!gameState) {
      return NextResponse.json({ error: 'Game state not found' }, { status: 404 });
    }

    if (!gameState.currentRoundId) {
      return NextResponse.json({ error: 'Current round ID is not set' }, { status: 400 });
    }

    const round = await prisma.round.findUnique({
      where: { id: gameState.currentRoundId }, // Now `gameState.currentRoundId` is guaranteed to be a string
    });

    if (!round || !round.pointPool.includes(pointsUsed)) {
      return NextResponse.json(
        { error: 'Invalid points value selected for this round' },
        { status: 400 }
      );
    }

    // Submit the answer
    const submittedAnswer = await prisma.answer.create({
      data: {
        teamId,
        questionId,
        answer,
        pointsUsed,
        isCorrect: false, // Default value
        pointsAwarded: 0, // Default value
      },
    });

    // Update the round's point pool to remove the used points
    const updatedPool = round.pointPool.filter((p) => p !== pointsUsed);
    await prisma.round.update({
      where: { id: round.id },
      data: { pointPool: updatedPool },
    });

    return NextResponse.json({
      message: 'Answer submitted successfully',
      submittedAnswer,
    });
  } catch (error) {
    console.error('Error submitting answer:', error);
    return NextResponse.json(
      { error: 'Failed to submit answer' },
      { status: 500 }
    );
  }
}

// PUT: Update the game state
// PUT: Update the game state
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const { isTransitioning, currentRoundId, currentQuestionId } = await req.json();

  try {
    if (isTransitioning) {
      // Handle transition state
      const gameState = await prisma.gameState.upsert({
        where: { gameId },
        update: {
          isTransitioning: true,
          currentRoundId: null,
          currentQuestionId: null,
          updatedAt: new Date(),
        },
        create: {
          gameId,
          isTransitioning: true,
          currentRoundId: null,
          currentQuestionId: null,
        },
      });

      return NextResponse.json({
        message: 'Game is now in transition state',
        gameState,
      });
    }

    if (currentQuestionId) {
      // Handle moving to the next question within the same round
      const gameState = await prisma.gameState.update({
        where: { gameId },
        data: {
          isTransitioning: false,
          currentRoundId, // Keep the current round
          currentQuestionId, // Update the current question
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        message: 'Game progressed to next question',
        gameState,
      });
    }

    // Handle transition to the next round
    const currentRound = await prisma.round.findUnique({
      where: { id: currentRoundId },
    });

    if (!currentRound) {
      return NextResponse.json(
        { error: 'Current round not found' },
        { status: 404 }
      );
    }

    // Find the next round based on sortOrder
    const nextRound = await prisma.round.findFirst({
      where: {
        gameId,
        sortOrder: { gt: currentRound.sortOrder }, // Find the next higher sortOrder
      },
      orderBy: {
        sortOrder: 'asc', // Ensure the next round is the smallest greater sortOrder
      },
      include: {
        questions: true,
      },
    });
    

    if (!nextRound) {
      return NextResponse.json(
        { error: 'No more rounds available' },
        { status: 404 }
      );
    }

    if (nextRound.questions.length === 0) {
      return NextResponse.json(
        { error: 'Next round has no questions' },
        { status: 400 }
      );
    }

    // Update game state with next round and its first question
    console.log("STATE: Current round ID: " + currentRoundId + "\nNext Round ID: " + nextRound.id);
    const updatedGameState = await prisma.gameState.update({
      where: { gameId },
      data: {
        isTransitioning: false,
        currentRoundId: nextRound.id,
        currentQuestionId: nextRound.questions[0].id,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: 'Game progressed to next round',
      gameState: updatedGameState,
    });
  } catch (error) {
    console.error('Error updating game state:', error);
    return NextResponse.json(
      { error: 'Failed to update game state' },
      { status: 500 }
    );
  }
}
