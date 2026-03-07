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
        site: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      game: {
        id: game.id,
        title: game.title,
        joinCode: game.joinCode,
        status: game.status,
        scheduledFor: game.scheduledFor,
        site: game.site
          ? {
              id: game.site.id,
              name: game.site.name,
              address: game.site.address,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Error fetching game data:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}