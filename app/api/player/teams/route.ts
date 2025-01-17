import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

interface DecodedToken {
  userId: string; // Use userId from the token payload
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

    // Fetch teams the user is associated with
    const teams = await prisma.teamMembership.findMany({
      where: { userId },
      include: {
        team: {
          include: {
            teamGames: {
              include: {
                game: {
                  include: { hostingSite: true }, // Include hosting site information for each game
                },
              },
            },
            captain: true, // Include captain information
          },
        },
      },
    });
    
    // Transform the result to make it easier to use if necessary
    const formattedTeams = teams.map((membership) => ({
      teamId: membership.team.id,
      teamName: membership.team.name,
      captain: membership.team.captain,
      games: membership.team.teamGames.map((teamGame) => ({
        gameId: teamGame.game.id,
        gameName: teamGame.game.name,
        gameDate: teamGame.game.date,
        hostingSite: teamGame.game.hostingSite,
      })),
    }));
    
    
    const result = formattedTeams.map((membership) => ({
      id: membership.teamId,
      name: membership.teamName,
      games: membership.games.map((game) => ({
        id: game.gameId,
        name: game.gameName,
        date: game.gameDate,
        hostingSite: game.hostingSite,
      })),
      isCaptain: membership.captain?.id === userId,
    }));
    
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}
