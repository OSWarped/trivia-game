import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  try {
    const gs = await prisma.gameState.findUnique({
      where: { gameId },
      include: {
        game: {
          include: {
            season: {
              select: {
                id: true,
                name: true,
              },
            },
            site: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
            rounds: {
              orderBy: { sortOrder: 'asc' },
              include: {
                questions: {
                  orderBy: { sortOrder: 'asc' },
                  select: {
                    id: true,
                    text: true,
                    type: true,
                    sortOrder: true,
                    options: {
                      select: {
                        id: true,
                        text: true,
                        isCorrect: true,
                      },
                    },
                  },
                },
              },
            },
            teamGames: {
              include: {
                team: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                answers: {
                  select: {
                    questionId: true,
                    given: true,
                    isCorrect: true,
                    awardedPoints: true,
                    pointsUsed: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!gs) {
      const game = await prisma.game.findUnique({
        where: { id: gameId },
        select: {
          id: true,
          status: true,
        },
      });

      if (!game) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 });
      }

      if (game.status === 'DRAFT' || game.status === 'SCHEDULED') {
        return NextResponse.json(
          {
            error: 'Game has not been started yet',
            gameStatus: game.status,
          },
          { status: 409 }
        );
      }

      if (game.status === 'LIVE') {
        return NextResponse.json(
          {
            error: 'Game state is missing for this LIVE game',
            gameStatus: game.status,
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          error: 'Game state is unavailable',
          gameStatus: game.status,
        },
        { status: 409 }
      );
    }

    const payload = {
      gameId: gs.gameId,
      currentRoundId: gs.currentRoundId,
      currentQuestionId: gs.currentQuestionId,
      pointsRemaining: gs.pointsRemaining,
      questionStartedAt: gs.questionStartedAt?.toISOString() ?? null,
      isAcceptingAnswers: gs.isAcceptingAnswers,
      createdAt: gs.createdAt.toISOString(),
      updatedAt: gs.updatedAt.toISOString(),

      game: {
        id: gs.game.id,
        title: gs.game.title,
        status: gs.game.status,
        tag: gs.game.tag ?? null,
        scheduledFor: gs.game.scheduledFor?.toISOString() ?? null,

        season: {
          id: gs.game.season.id,
          name: gs.game.season.name,
        },

        site: gs.game.site
          ? {
              id: gs.game.site.id,
              name: gs.game.site.name,
              address: gs.game.site.address,
            }
          : null,

        rounds: gs.game.rounds.map((r) => ({
          id: r.id,
          name: r.name,
          pointSystem: r.pointSystem,
          pointPool: r.pointSystem === 'POOL' ? r.pointPool : undefined,
          pointValue: r.pointSystem === 'FLAT' ? r.pointValue : undefined,
          questions: r.questions.map((q) => ({
            id: q.id,
            text: q.text,
            type: q.type,
            sortOrder: q.sortOrder,
            options: q.options,
          })),
        })),

        teamGames: gs.game.teamGames.map((tg) => ({
          team: {
            id: tg.team.id,
            name: tg.team.name,
          },
          score: tg.totalPts,
          answers: tg.answers.map((a) => ({
            questionId: a.questionId,
            given: a.given,
            isCorrect: a.isCorrect,
            awardedPoints: a.awardedPoints,
            pointsUsed: a.pointsUsed,
          })),
        })),
      },
    } as const;

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error('Error fetching game state:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch game state',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}