import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  try {
    // Fetch game and related data
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        rounds: {
          orderBy: { sortOrder: 'asc' },
          include: {
            questions: {
              include: {
                options: true,
              },
            },
          },
        },
        teamGames: {
          include: { team: true },
        },
      },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Game has already started or completed' }, { status: 400 });
    }

    const firstRound = game.rounds[0];
    const firstQuestion = firstRound?.questions[0] || null;

    let pointsRemaining: Record<string, number[]> = {};

    if (firstRound && firstRound.pointSystem === 'POOL') {
      const pointPool = Array.isArray(firstRound.pointPool) ? firstRound.pointPool : [];

      if (pointPool.length === 0) {
        return NextResponse.json(
          { error: 'First round is POOL type but has no valid point pool defined.' },
          { status: 400 }
        );
      }

      pointsRemaining = game.teamGames.reduce((acc, teamGame) => {
        acc[teamGame.team.id] = [...pointPool];
        return acc;
      }, {} as Record<string, number[]>);
    }

    // 🔄 Use upsert to create or update the game state safely
    await prisma.gameState.upsert({
      where: { gameId },
      update: {
        currentRoundId: firstRound?.id || null,
        currentQuestionId: firstQuestion?.id || null,
        pointsRemaining: pointsRemaining ?? {},
        isAcceptingAnswers: false,
        questionStartedAt: null,
      },
      create: {
        gameId,
        currentRoundId: firstRound?.id || null,
        currentQuestionId: firstQuestion?.id || null,
        pointsRemaining: pointsRemaining ?? {},
        isAcceptingAnswers: false,
        questionStartedAt: null,
      },
    });

    // Update the game's status to LIVE
    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        status: 'LIVE',
        startedAt: new Date(),
      },
      include: {
        Site: true,
        teamGames: {
          include: { team: true },
        },
      },
    });

    return NextResponse.json({
      id: updatedGame.id,
      title: updatedGame.title,
      status: updatedGame.status,
      scheduledFor: updatedGame.scheduledFor,
      hostingSite: {
        id: updatedGame.Site?.id,
        name: updatedGame.Site?.name,
        location: updatedGame.Site?.address,
      },
      teams: updatedGame.teamGames.map((teamGame) => ({
        id: teamGame.team.id,
        name: teamGame.team.name,
      })),
      message: 'Game started successfully!',
    });
  } catch (error) {
    console.error('Error starting game:', error);
    return NextResponse.json({ error: 'Failed to start game' }, { status: 500 });
  }
}
