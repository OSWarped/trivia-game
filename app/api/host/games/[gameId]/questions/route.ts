import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/host/games/[gameId]/questions
 * Returns a flat list of question IDs and their text for the given game.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  if (!gameId) {
    return NextResponse.json({ error: 'Missing gameId parameter' }, { status: 400 });
  }

  try {
    // Fetch all questions for this game via the round relation
    const questions = await prisma.question.findMany({
      where: { round: { gameId } },
      select: { id: true, text: true },
    });

    return NextResponse.json(questions);
  } catch (err: any) {
    console.error('Error fetching questions for host results:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
