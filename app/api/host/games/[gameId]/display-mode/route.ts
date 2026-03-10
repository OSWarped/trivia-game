import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type DisplayMode = 'QUESTION' | 'LOBBY' | 'ANSWER_REVEAL' | 'LEADERBOARD';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  try {
    const body = (await req.json()) as { displayMode?: DisplayMode };

    if (!body.displayMode) {
      return NextResponse.json(
        { error: 'displayMode is required' },
        { status: 400 }
      );
    }

    const allowed: DisplayMode[] = [
      'QUESTION',
      'LOBBY',
      'ANSWER_REVEAL',
      'LEADERBOARD',
    ];

    if (!allowed.includes(body.displayMode)) {
      return NextResponse.json(
        { error: 'Invalid display mode' },
        { status: 400 }
      );
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const updated = await prisma.game.update({
      where: { id: gameId },
      data: { displayMode: body.displayMode },
    });

    return NextResponse.json({
      message: 'Display mode updated',
      game: updated,
    });
  } catch (error) {
    console.error('Error updating display mode:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}