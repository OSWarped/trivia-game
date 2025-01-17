import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request, { params }: { params: Promise<{ teamId: string }> }) {
  try {
    const { teamId } = await params;

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    // Fetch games joined by the team
    const games = await prisma.teamGame.findMany({
      where: {
        teamId,
      },
      include: {
        game: true,
      },
    });

    // Extract game details
    const formattedGames = games.map((tg) => tg.game);

    return NextResponse.json(formattedGames, { status: 200 });
  } catch (error) {
    console.error('Error fetching games for team:', error);
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  }
}
