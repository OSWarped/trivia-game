import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const { gameId } = await params;

    // Fetch the game details
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        rounds: {
          include: {
            questions: true
          }
        },
        event: {
          include: {
            site: true, // 🔥 Include the related Site through the Event
          }
        }
      }
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json({ game });
  } catch (error) {
    console.error('Error fetching game data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
