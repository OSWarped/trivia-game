import { NextResponse } from 'next/server';
import { Game, GameState, PrismaClient, Round, TeamGame } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  try {
    const gameState = await prisma.gameState.findUnique({
      where: { gameId },
      include: {
        game: {
          include: {
            rounds: {
              orderBy: { sortOrder: 'asc' },
              include: {
                questions: {
                  orderBy: { sortOrder: 'asc' },
                  include: {
                    options: true,
                    answers: true,
                  },
                },
              },
            },
            teamGames: {
              include: {
                team: true,
                answers: {
                  include: {
                    question: true,
                  },
                },
              },
            },
          },
        },
      },
    }) as (GameState & {
      game: Game & {
        rounds: (Round & {
          questions: {
            id: string;
            text: string;
            type: string;
            options: { id: string; text: string; isCorrect: boolean }[];
            answers: any[];
            sortOrder: number;
          }[];
        })[];
        teamGames: (TeamGame & {
          team: { id: string; name: string };
          answers: any[];
        })[];
      };
    });

    if (!gameState) {
      return NextResponse.json({ error: 'Game state not found' }, { status: 404 });
    }

    const answersByTeam = gameState.game.teamGames.reduce((acc, tg) => {
      acc[tg.teamId] = tg.answers.map((a) => ({
        questionId: a.questionId,
        given: a.given,
        isCorrect: a.isCorrect,
        awardedPoints: a.awardedPoints,
      }));
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      ...gameState,
      answersByTeam,
    });
  } catch (error) {
    console.error('❌ Error fetching game state:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game state' },
      { status: 500 }
    );
  }
}