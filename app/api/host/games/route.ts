import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromToken } from '@/utils/auth'; // Import the new utility function

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Get the authenticated user from the token
    const user = await getUserFromToken();

    if (!user || !user.roles.includes('HOST')) {
      console.error('Unauthorized access - user does not have the HOST role');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Look up the user's name by email
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true, name: true }, // Fetch only the necessary fields
    });

    if (!dbUser) {
      console.error('User not found in the database');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const hostId = dbUser.id; // Use the ID from the database
    console.log('Host ID:', hostId);

    // Fetch games hosted by the user
    const games = await prisma.game.findMany({
      where: {
        hostId: hostId, // Match the hostId from the user
      },
      orderBy: {
        date: 'asc',
      },
      include: {
        hostingSite: true, // Include hosting site details
        teamGames: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
              }, // Include team IDs and names
            },
          },
        },
      },
    });
    
    // Transform the result to include the teams in the desired structure
    const formattedGames = games.map((game) => ({
      ...game,
      teams: game.teamGames.map((teamGame) => teamGame.team),
    }));
    
    

    // Attach host information to the games
    const gamesWithHost = formattedGames.map((game) => ({
      ...game,
      host: { name: dbUser.name }, // Use the database user's name
    }));

    console.log('Fetched games with host information:', gamesWithHost);

    return NextResponse.json(gamesWithHost);
  } catch (error) {
    console.error('Error fetching host games:', error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'An unexpected error occurred while fetching host games.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
