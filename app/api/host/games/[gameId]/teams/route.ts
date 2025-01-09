import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Retrieve all teams for a specific game
export async function GET(req: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;

  try {
    const teams = await prisma.team.findMany({
      where: {
        gameId,
      },
    });

    return NextResponse.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}

// POST: Add a new team to a specific game
export async function POST(req: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const { name } = await req.json();

  if (!name) {
    return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
  }

  try {
    const newTeam = await prisma.team.create({
      data: {
        name,
        gameId,
      },
    });

    return NextResponse.json(newTeam, { status: 201 });
  } catch (error) {
    console.error('Error adding team:', error);
    return NextResponse.json({ error: 'Failed to add team' }, { status: 500 });
  }
}
