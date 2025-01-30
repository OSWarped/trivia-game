import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromToken } from '@/utils/auth'; // Import your utility function
const prisma = new PrismaClient();

export async function GET() {
  try {
    // Get the authenticated user
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the sites the user is associated with
    const userSites = await prisma.siteMembership.findMany({
      where: { userId: user.userId },
      select: { hostingSiteId: true },
    });

    const userSiteIds = userSites.map((site) => site.hostingSiteId);

    // Fetch teams the user can join, but only for teams playing at sites they are associated with
    const availableTeams = await prisma.team.findMany({
      where: {
        // Exclude teams where the user is already a member
        memberships: { none: { userId: user.userId } },

        // Exclude teams where the user has a pending join request
        TeamJoinRequest: { none: { userId: user.userId, status: 'PENDING' } },

        // Only include teams that are associated with games hosted at sites the user is part of
        teamGames: {
          some: {
            game: {
              hostingSiteId: { in: userSiteIds },
            },
          },
        },
      },
      include: {
        teamGames: {
          include: {
            game: {
              include: {
                hostingSite: true, // Include hosting site details
              },
            },
          },
        },
        captain: true, // Include captain details
      },
    });

    // Format the data for the frontend
    const formattedTeams = availableTeams.map((team) => ({
      id: team.id,
      name: team.name,
      captainName: team.captain?.name || 'Unknown',
      games: team.teamGames.map((teamGame) => ({
        id: teamGame.game.id,
        name: teamGame.game.name,
        date: teamGame.game.date,
        hostingSite: {
          id: teamGame.game.hostingSite.id,
          name: teamGame.game.hostingSite.name,
          location: teamGame.game.hostingSite.location,
        },
      })),
    }));

    return NextResponse.json(formattedTeams);
  } catch (error) {
    console.error('Error fetching available teams:', error);
    return NextResponse.json({ error: 'Failed to fetch available teams' }, { status: 500 });
  }
}
