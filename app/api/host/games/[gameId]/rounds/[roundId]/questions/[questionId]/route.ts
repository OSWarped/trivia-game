import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request, { params }: { params: Promise<{ gameId: string, roundId: string }> }) {
  const { roundId } = await params;

  try {
    const questions = await prisma.question.findMany({
      where: {
        roundId: roundId, // Filter by roundId
      },
      include: {
        correctAnswer: true, // Optionally include correct answer for the question
      },
    });

    return NextResponse.json(questions.length > 0 ? questions : []);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}
