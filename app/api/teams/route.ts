import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromToken } from '@/utils/auth'; // Import the new utility function

const prisma = new PrismaClient();

// GET: Fetch all teams
export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      include: {
        memberships: {
          include: {
            user: true, // Include user details for each membership
          },
        },
        captain: true, // Include captain details
        teamGames: {
          include: {
            game: {
              select: {
                id: true,
                name: true,
                date: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}

// POST: Create a new team
export async function POST(req: Request) {
  try {
    const { name, hostingSiteIds } = await req.json();

    // Get the current user from the request (assumes you have a function to handle this)
    const currentUser = await getUserFromToken();

    if (!currentUser || !currentUser.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: 'Team name is required' },
        { status: 400 }
      );
    }

    // Ensure hostingSiteIds is an array (it may be undefined if no sites are selected)
    const siteIds = Array.isArray(hostingSiteIds) ? hostingSiteIds : [];

    const newTeam = await prisma.$transaction(async (prisma) => {
      // Step 1: Create the team
      const team = await prisma.team.create({
        data: {
          name,
          ...(siteIds.length > 0 && {
            hostingSites: {
              connect: siteIds.map((id: string) => ({ id })), // Connect hosting sites
            },
          }),
        },
        select: {
          id: true,
          name: true,
        },
      });

      // Step 2: Add the current user as the captain
      await prisma.teamMembership.create({
        data: {
          teamId: team.id,
          userId: currentUser.userId,
        },
      });

      // Step 3: Set the captain in the team
      await prisma.team.update({
        where: { id: team.id },
        data: { captainId: currentUser.userId },
      });

      return team;
    });

    return NextResponse.json(newTeam, { status: 201 });
  } catch (error) {
    console.error('Error creating team:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Failed to create team' },
      { status: 500 }
    );
  }
}

// DELETE: Delete all teams (use with caution)
export async function DELETE() {
  try {
    await prisma.team.deleteMany();
    return NextResponse.json({ message: 'All teams deleted' });
  } catch (error) {
    console.error('Error deleting teams:', error);
    return NextResponse.json(
      { error: 'Failed to delete teams' },
      { status: 500 }
    );
  }
}
