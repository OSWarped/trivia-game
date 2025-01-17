import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request, { params }: { params: Promise<{ teamId: string }> }) {
  try {
    const { teamId } = await params;
    const { gameId } = await req.json();

    if (!teamId || !gameId) {
      return NextResponse.json({ error: 'Team ID and Game ID are required' }, { status: 400 });
    }

    // Create a TeamGame record
    const teamGame = await prisma.teamGame.create({
      data: {
        teamId,
        gameId,
      },
    });

    return NextResponse.json(teamGame, { status: 201 });
  } catch (error) {
    console.error('Error joining game:', error);
    return NextResponse.json({ error: 'Failed to join game' }, { status: 500 });
  }
}
