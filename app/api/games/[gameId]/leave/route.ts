import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const { teamId } = await req.json();

    if (!gameId || !teamId) {
      return NextResponse.json(
        { error: 'Game ID and Team ID are required' },
        { status: 400 }
      );
    }

    // Check if the game exists
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Check if the team is part of the game
    const existingTeamGame = await prisma.teamGame.findUnique({
      where: {
        teamId_gameId: {
          teamId,
          gameId,
        },
      },
    });

    if (!existingTeamGame) {
      return NextResponse.json(
        { error: 'Team is not part of this game' },
        { status: 400 }
      );
    }

    // Remove the team from the game
    await prisma.teamGame.delete({
      where: {
        id: existingTeamGame.id,
      },
    });

    return NextResponse.json(
      { message: 'Team successfully removed from the game' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error removing team from game:', error);
    return NextResponse.json(
      { error: 'Failed to remove team from game' },
      { status: 500 }
    );
  }
}
