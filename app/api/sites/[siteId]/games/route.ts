import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request, { params }: { params: Promise<{ siteId: string }> }) {
  try {
    const { siteId } = await params;

    if (!siteId) {
      return NextResponse.json({ error: 'Site ID is required' }, { status: 400 });
    }

    const url = new URL(req.url);
    const teamId = url.searchParams.get('teamId'); // Optional query parameter for team ID

    // Fetch games
    const games = await prisma.game.findMany({
      where: {
        hostingSiteId: siteId,
      },
      orderBy: {
        date: 'asc',
      },
      include: {
        teamGames: {
          select: {
            teamId: true,
          },
        },
      },
    });

    // Include a `joined` flag if teamId is provided
    const gamesWithJoinStatus = games.map((game) => ({
      ...game,
      joined: teamId
        ? game.teamGames.some((tg) => tg.teamId === teamId)
        : false,
    }));

    return NextResponse.json(gamesWithJoinStatus, { status: 200 });
  } catch (error) {
    console.error('Error fetching games for site:', error);
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  }
}
