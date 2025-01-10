import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        game: true,
        memberships: {
          include: {
            user: true, // Fetch the user details through TeamMembership
          },
        },
        captain: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json(team, { status: 200 });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;
  const { userId } = await req.json();

  if (!teamId || !userId) {
    return NextResponse.json({ error: 'Team ID and User ID are required' }, { status: 400 });
  }

  try {
    // Find the team to get the associated game ID
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { game: true },
    });

    if (!team || !team.gameId) {
      return NextResponse.json({ error: 'Team or game not found' }, { status: 404 });
    }

    const gameId = team.gameId;

    // Check if the user is already part of another team in the same game
    const existingMembership = await prisma.teamMembership.findFirst({
      where: {
        userId,
        gameId,
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: 'User is already a member of another team in this game' },
        { status: 400 }
      );
    }

    // Add the user to the team
    await prisma.teamMembership.create({
      data: {
        userId,
        teamId,
        gameId,
      },
    });

    // Return the updated team information, including user memberships
    const updatedTeam = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        memberships: {
          include: {
            user: true, // Fetch the users through TeamMembership
          },
        },
      },
    });

    return NextResponse.json(updatedTeam, { status: 200 });
  } catch (error) {
    console.error('Error adding user to team:', error);
    return NextResponse.json({ error: 'Failed to add user to team' }, { status: 500 });
  }
}
