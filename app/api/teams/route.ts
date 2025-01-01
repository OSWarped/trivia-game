import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Fetch all teams
export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      include: {
        players: true, // Include players in each team
        captain: true, // Include captain details
        game: true,    // Include associated game details
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

    const newTeam = await prisma.team.create({
      data: {
        name,
        captain: { connect: { id: captainId } },
        game: gameId ? { connect: { id: gameId } } : undefined, // Optional game association
      },
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
