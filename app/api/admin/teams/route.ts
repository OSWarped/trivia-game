import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      include: {
        game: true, // Include related game details
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
      const { name, gameId, captainId } = await req.json();
  
      if (!name || !gameId) {
        return NextResponse.json({ error: 'Name and game ID are required' }, { status: 400 });
      }
  
      // Validate gameId and captainId before proceeding
      const gameExists = await prisma.game.findUnique({ where: { id: gameId } });
      if (!gameExists) {
        return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 });
      }
  
      const captainExists = await prisma.user.findUnique({ where: { id: captainId } });
      if (!captainExists) {
        return NextResponse.json({ error: 'Invalid captain ID' }, { status: 400 });
      }
  
      // Create the team with explicit connections
      const newTeam = await prisma.team.create({
        data: {
          name,
          game: { connect: { id: gameId } },
          captain: captainId ? { connect: { id: captainId } } : undefined,
        },
      });
  
      return NextResponse.json(newTeam, { status: 201 });
    } catch (error) {
      console.error('Error creating team:', error);
      return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
    }
  }
  