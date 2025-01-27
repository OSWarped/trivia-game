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
  
      // Perform the reset operation in a transaction
      await prisma.$transaction(async (prisma) => {
        // Delete the GameState record
        await prisma.gameState.deleteMany({
          where: { gameId },
        });
  
        // Delete all Answers associated with the game
        await prisma.answer.deleteMany({
          where: {
            question: {
              round: {
                gameId,
              },
            },
          },
        });
  
        // Delete all SubQuestionAnswers associated with the game
        await prisma.subQuestionAnswer.deleteMany({
          where: {
            subquestion: {
              question: {
                round: {
                  gameId,
                },
              },
            },
          },
        });
  
        // Reset the Game status to PENDING
        await prisma.game.update({
          where: { id: gameId },
          data: { status: "PENDING" },
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
  