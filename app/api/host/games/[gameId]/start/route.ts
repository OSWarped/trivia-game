import { NextResponse } from 'next/server';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class StartGameError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'StartGameError';
  }
}

const startGameArgs = Prisma.validator<Prisma.GameDefaultArgs>()({
  include: {
    site: {
      select: {
        id: true,
        name: true,
        address: true,
      },
    },
    gameState: true,
    rounds: {
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        sortOrder: true,
        pointSystem: true,
        pointPool: true,
        questions: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            sortOrder: true,
          },
        },
      },
    },
    teamGames: {
      select: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    },
  },
});

type StartableGame = Prisma.GameGetPayload<typeof startGameArgs>;

function normalizePointPool(pointPool: Prisma.JsonValue | null): number[] {
  if (!Array.isArray(pointPool)) {
    return [];
  }

  return pointPool.filter(
    (value): value is number =>
      typeof value === 'number' && Number.isInteger(value) && value >= 0
  );
}

function buildPointsRemaining(
  teamIds: string[],
  pointPool: number[]
): Record<string, number[]> {
  return teamIds.reduce<Record<string, number[]>>((acc, teamId) => {
    acc[teamId] = [...pointPool];
    return acc;
  }, {});
}

function buildResponse(game: StartableGame, message: string) {
  return {
    id: game.id,
    title: game.title,
    status: game.status,
    startedAt: game.startedAt,
    scheduledFor: game.scheduledFor,
    hostingSite: {
      id: game.site?.id ?? null,
      name: game.site?.name ?? null,
      location: game.site?.address ?? null,
    },
    gameState: game.gameState
      ? {
          currentRoundId: game.gameState.currentRoundId,
          currentQuestionId: game.gameState.currentQuestionId,
          pointsRemaining: game.gameState.pointsRemaining,
          isAcceptingAnswers: game.gameState.isAcceptingAnswers,
          questionStartedAt: game.gameState.questionStartedAt,
        }
      : null,
    teams: game.teamGames.map(({ team }) => ({
      id: team.id,
      name: team.name,
    })),
    message,
  };
}

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  try {
    const payload = await prisma.$transaction(async (tx) => {
      const game = await tx.game.findUnique({
        where: { id: gameId },
        ...startGameArgs,
      });

      if (!game) {
        throw new StartGameError(404, 'Game not found');
      }

      // TODO: Add host/admin authorization check here when wiring auth into this route.

      if (game.status === 'CLOSED') {
        throw new StartGameError(400, 'Game has already been closed.');
      }

      if (game.status === 'CANCELED') {
        throw new StartGameError(400, 'Game has been canceled.');
      }

      if (
        game.status !== 'DRAFT' &&
        game.status !== 'SCHEDULED' &&
        game.status !== 'LIVE'
      ) {
        throw new StartGameError(
          400,
          `Game cannot be started from status ${game.status}.`
        );
      }

      if (game.teamGames.length === 0) {
        throw new StartGameError(
          400,
          'Add at least one team before starting the game.'
        );
      }

      if (game.rounds.length === 0) {
        throw new StartGameError(
          400,
          'Add at least one round before starting the game.'
        );
      }

      const firstRound = game.rounds[0];
      const firstQuestion = firstRound.questions[0];

      if (!firstQuestion) {
        throw new StartGameError(
          400,
          'The first round does not contain a valid first question.'
        );
      }

      let pointsRemaining: Record<string, number[]> = {};

      if (firstRound.pointSystem === 'POOL') {
        const pointPool = normalizePointPool(firstRound.pointPool);

        if (pointPool.length === 0) {
          throw new StartGameError(
            400,
            'First round is POOL type but has no valid point pool defined.'
          );
        }

        const teamIds = game.teamGames.map(({ team }) => team.id);
        pointsRemaining = buildPointsRemaining(teamIds, pointPool);
      }

      // Already live with state: idempotent success
      if (game.status === 'LIVE' && game.gameState) {
        return buildResponse(game, 'Game is already live.');
      }

      // LIVE but missing state: repair it
      await tx.gameState.upsert({
        where: { gameId },
        update: {
          currentRoundId: firstRound.id,
          currentQuestionId: firstQuestion.id,
          pointsRemaining,
          isAcceptingAnswers: false,
          questionStartedAt: null,
        },
        create: {
          gameId,
          currentRoundId: firstRound.id,
          currentQuestionId: firstQuestion.id,
          pointsRemaining,
          isAcceptingAnswers: false,
          questionStartedAt: null,
        },
      });

      if (game.status !== 'LIVE') {
        const claimed = await tx.game.updateMany({
          where: {
            id: gameId,
            status: {
              in: ['DRAFT', 'SCHEDULED'],
            },
          },
          data: {
            status: 'LIVE',
            startedAt: game.startedAt ?? new Date(),
          },
        });

        if (claimed.count === 0) {
          throw new StartGameError(
            409,
            'Game could not be started because its status changed. Refresh and try again.'
          );
        }
      }

      const startedGame = await tx.game.findUnique({
        where: { id: gameId },
        ...startGameArgs,
      });

      if (!startedGame || !startedGame.gameState) {
        throw new Error(
          'Game was not returned with a valid initial state after start.'
        );
      }

      return buildResponse(startedGame, 'Game started successfully!');
    });

    return NextResponse.json(payload);
  } catch (error: unknown) {
    if (error instanceof StartGameError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2034'
    ) {
      return NextResponse.json(
        {
          error:
            'Another request tried to start this game at the same time. Refresh and try again.',
        },
        { status: 409 }
      );
    }

    console.error('Error starting game:', error);
    return NextResponse.json(
      {
        error: 'Failed to start game',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}