import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      include: {
        teamGames: {
          include: {
            game: true, // Include related game details through the TeamGame relationship
          },
        },
        captain: true, // Include the team captain
        memberships: {
          include: {
            user: true, // Include user details for each team member
          },
        },
      },
    });
    

    // Map the data to include members in a readable format
    const teamsWithMembers = teams.map((team) => ({
      ...team,
      members: team.memberships.map((membership) => ({
        id: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
      })),
    }));

    return NextResponse.json(teamsWithMembers, { status: 200 });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, captainId } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Validate captainId before proceeding
    if (captainId) {
      const captainExists = await prisma.user.findUnique({ where: { id: captainId } });
      if (!captainExists) {
        return NextResponse.json({ error: 'Invalid captain ID' }, { status: 400 });
      }
    }

    // Create the team without referencing a game
    const newTeam = await prisma.team.create({
      data: {
        name,
        captain: captainId ? { connect: { id: captainId } } : undefined,
      },
    });

    return NextResponse.json(newTeam, { status: 201 });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
}