// app/api/host/games/[gameId]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request, { params }: { params: Promise<{ gameId: string }> }) {
  // Await the params promise
  const { gameId } = await params;

  try {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        hostingSite: true, // Include hosting site details
      },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json(game);
  } catch (error) {
    console.error('Error fetching game:', error);
    return NextResponse.json({ error: 'Failed to fetch game' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  try {
    // Update the game's status to COMPLETED
    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: { status: "COMPLETED" },
    });

    return NextResponse.json({
      message: "Game status updated to COMPLETED",
      game: updatedGame,
    });
  } catch (error) {
    console.error("Error updating game status:", error);
    return NextResponse.json(
      { error: "Failed to update game status" },
      { status: 500 }
    );
  }
}
