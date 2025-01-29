import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromToken } from '@/utils/auth'; // Import your utility function

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Get the authenticated user
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.userId;

    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
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
                  include: { hostingSite: true }, // Fetch hosting sites linked via games
                },
              },
            },
            hostingSites: { // 🔥 Include hosting sites directly assigned to the team 🔥
              select: {
                id: true,
                name: true,
                location: true,
              },
            },
            captain: true, // Include captain information
            memberships: {
              include: { user: true }, // Fetch all team members
            },
          },
        },
      },
    });

    // Transform the result for easier usage
    const formattedTeams = teams.map((membership) => ({
      id: membership.team.id,
      name: membership.team.name,
      isCaptain: membership.team.captain?.id === userId,
      games: membership.team.teamGames.map((teamGame) => ({
        id: teamGame.game.id,
        name: teamGame.game.name,
        date: teamGame.game.date,
        hostingSite: teamGame.game.hostingSite,
      })),
      hostingSites: membership.team.hostingSites, // 🔥 Ensure this is included 🔥
      members: membership.team.memberships.map((member) => ({
        id: member.user.id,
        name: member.user.name,
      })),
    }));

    return NextResponse.json(formattedTeams);
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}
