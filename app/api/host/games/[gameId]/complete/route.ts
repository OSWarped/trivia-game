import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  try {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'LIVE') {
      return NextResponse.json({ error: 'Game must be closed before completing' }, { status: 400 });
    }

    const updated = await prisma.game.update({
      where: { id: gameId },
      data: { status: 'CLOSED' },
    });

    return NextResponse.json({ message: 'Game marked as completed', game: updated });
  } catch (error) {
    console.error('Error completing game:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
