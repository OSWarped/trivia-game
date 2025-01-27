import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const { gameId } = await params;

    // Fetch the game to get the hosting site
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { hostingSite: true },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const hostingSiteId = game.hostingSiteId;

    // Fetch all teams at the hosting site
    const teamsAtHostingSite = await prisma.team.findMany({
      where: {
        TeamHostingSite: {
          some: { hostingSiteId },
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    // Fetch teams already in the game
const teamsInGame = await prisma.team.findMany({
  where: {
    teamGames: {
      some: {
        gameId, // Check for teams linked to the game through TeamGame
      },
    },
  },
  select: {
    id: true,
  },
});
    
    // Filter out teams already in the game
    const availableTeams = await prisma.team.findMany({
      where: {
        TeamHostingSite: {
          some: { hostingSiteId },
        },
        teamGames: {
          none: { gameId },
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    // Debugging output
    console.log('Hosting Site ID:', hostingSiteId);
    console.log('Teams at Hosting Site:', teamsAtHostingSite);
    console.log('Teams Already in Game:', teamsInGame);
    console.log('Available Teams:', availableTeams);

    return NextResponse.json(availableTeams);
  } catch (error) {
    console.error('Error fetching available teams:', error);
    return NextResponse.json({ error: 'Failed to fetch available teams' }, { status: 500 });
  }
}
