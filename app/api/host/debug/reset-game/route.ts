import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { gameId } = await req.json();

    if (!gameId) {
      return NextResponse.json(
        { error: "Missing required gameId" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Delete GameState
      await tx.gameState.deleteMany({
        where: { gameId },
      });

      // Delete all Answers for this game
      await tx.answer.deleteMany({
        where: {
          question: {
            round: {
              gameId,
            },
          },
        },
      });

      // Reset the game status to DRAFT
      await tx.game.update({
        where: { id: gameId },
        data: { status: "DRAFT" },
      });
    });

    return NextResponse.json({ message: "Game reset successfully." });
  } catch (error) {
    console.error("Error resetting game:", error);
    return NextResponse.json(
      { error: "Failed to reset the game." },
      { status: 500 }
    );
  }
}
