import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const body = await req.json();
  const { questionId } = body;

  if (!questionId) {
    return NextResponse.json({ error: 'Missing questionId' }, { status: 400 });
  }

  try {
    // Update the GameState model with the current question
    const updatedGameState = await prisma.gameState.update({
      where: { gameId },
      data: { currentQuestionId: questionId },
    });

    return NextResponse.json(
      { message: 'Current question updated successfully', updatedGameState },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating current question in GameState:', error);
    return NextResponse.json(
      { error: 'Failed to update current question' },
      { status: 500 }
    );
  }
}
