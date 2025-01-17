import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

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
    const { name, captainId, gameId } = await req.json();

    if (!name || !captainId) {
      return NextResponse.json({ error: 'Name and captainId are required' }, { status: 400 });
    }

    const newTeam = await prisma.$transaction(async (prisma) => {
      // Step 1: Create the team and ensure `id` is selected
      const team = await prisma.team.create({
        data: {
          name,
          ...(gameId && { game: { connect: { id: gameId } } }), // Include game only if gameId is provided
        },
        select: {
          id: true, // Explicitly select the `id` field
        },
      });
    
      // Step 2: Add the captain to the team via TeamMembership
      if (captainId) {
        await prisma.teamMembership.create({
          data: {
            teamId: team.id, // Use the team ID from the created team
            userId: captainId,
          },
        });
      }
    
      return team;
    });
    
    

    return NextResponse.json(newTeam, { status: 201 });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
}

// DELETE: Delete all teams (use with caution)
export async function DELETE() {
  try {
    await prisma.team.deleteMany();
    return NextResponse.json({ message: 'All teams deleted' });
  } catch (error) {
    console.error('Error deleting teams:', error);
    return NextResponse.json({ error: 'Failed to delete teams' }, { status: 500 });
  }
}
