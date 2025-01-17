import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(req: Request, { params }: { params: Promise<{ teamId: string }> }) {
  try {
    const { teamId } = await params;
    const { gameId } = await req.json();

    if (!teamId || !gameId) {
      return NextResponse.json({ error: 'Team ID and Game ID are required' }, { status: 400 });
    }

    // Delete the TeamGame record
    await prisma.teamGame.delete({
      where: {
        teamId_gameId: {
          teamId,
          gameId,
        },
      },
    });

    return NextResponse.json({ message: 'Successfully left the game' }, { status: 200 });
  } catch (error) {
    console.error('Error leaving game:', error);
    return NextResponse.json({ error: 'Failed to leave game' }, { status: 500 });
  }
}
