import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    // Fetch team details with captain and players (members)
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        captain: true,  // Include captain details
        players: true,  // Include team members (players)
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json(team);  // Send the team data with captain and members
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, captainId, memberIds } = await req.json();

  try {
    const updatedTeam = await prisma.team.update({
      where: { id },
      data: {
        name,
        captainId,
        players: {
          set: memberIds.map((id: string) => ({ id })), // Set the new members for the team
        },
      },
    });

    return NextResponse.json(updatedTeam);
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 });
  }
}


export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await prisma.team.delete({ where: { id } });
    return NextResponse.json({ message: 'Team deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 });
  }
}
