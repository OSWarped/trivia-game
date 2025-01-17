import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

interface DecodedToken {
  userId: string;
  email: string;
  roles: string[];
}

const prisma = new PrismaClient();

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authorization token is missing' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = user.id;

    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Fetch games associated with the player's teams
    const games = await prisma.game.findMany({
      where: {
        teamGames: {
          some: {
            team: {
              memberships: {
                some: {
                  userId, // Match the userId within team memberships
                },
              },
            },
          },
        },
      },
      include: {
        hostingSite: true, // Include hosting site information
        teamGames: {
          include: {
            team: {
              select: {
                id: true,
                name: true, // Include team IDs and names
              },
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
    

    const result = formattedGames.map((game) => ({
      id: game.id,
      name: game.name,
      date: game.date.toISOString().split('T')[0], // Extract only the date
      hostingSite: game.hostingSite,
      teams: game.teams,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  }
}
