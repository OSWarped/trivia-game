import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        rounds: {
          orderBy: { sortOrder: 'asc' },
          include: {
            questions: {
              orderBy: { sortOrder: 'asc' },
              include: {
                options: {
                  orderBy: [{ sortOrder: 'asc' }, { text: 'asc' }],
                },
              },
            },
          },
        },
      },
    });

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found.' },
        { status: 404 }
      );
    }

    const payload = {
      title: game.title,
      tag: game.tag ?? null,
      rounds: game.rounds.map((round) => ({
        name: round.name,
        roundType: round.roundType,
        pointSystem: round.pointSystem,
        maxPoints: round.maxPoints,
        pointValue: round.pointValue,
        pointPool: round.pointPool ?? [],
        timeLimit: round.timeLimit,
        wagerLimit: round.wagerLimit,
        sortOrder: round.sortOrder,
        questions: round.questions.map((question) => ({
          text: question.text,
          type: question.type,
          sortOrder: question.sortOrder,
          options: question.options.map((option) => ({
            text: option.text,
            isCorrect: option.isCorrect,
            sortOrder: option.sortOrder,
          })),
        })),
      })),
    } as const;

    return NextResponse.json(payload);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    console.error('Failed to export game template', { message });

    return NextResponse.json(
      { error: 'Failed to export game template.' },
      { status: 500 }
    );
  }
}