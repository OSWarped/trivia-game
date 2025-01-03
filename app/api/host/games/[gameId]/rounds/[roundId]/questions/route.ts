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

export async function POST(req: Request, { params }: { params: Promise<{ gameId: string, roundId: string }> }) {
    const { roundId } = await params;  // Await the params to get roundId
    const questionData = await req.json();
  
    try {
      // Fetch round data to get the point value from the round
      const round = await prisma.round.findUnique({
        where: { id: roundId },
        select: { pointValue: true },
      });
  
      if (!round) {
        return NextResponse.json({ error: 'Round not found' }, { status: 404 });
      }
  
      const newQuestion = await prisma.question.create({
        data: {
          text: questionData.text,
          type: questionData.type,
          roundId: roundId,
          // Create the correct answer if provided
          correctAnswer: questionData.correctAnswer
            ? {
                create: {
                  answer: questionData.correctAnswer,
                },
              }
            : undefined,
        },
      });
  
      return NextResponse.json(newQuestion);
    } catch (error) {
      console.error('Error creating question:', error);
      return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
    }
  }

  export async function PUT(req: Request, { params }: { params: Promise<{ gameId: string, roundId: string, questionId: string }> }) {
    const { roundId, questionId } = await params;  // Await the params to get roundId and questionId
    const questionData = await req.json();
  
    try {
      // Fetch round data to get the point value from the round
      const round = await prisma.round.findUnique({
        where: { id: roundId },
        select: { pointValue: true },
      });
  
      if (!round) {
        return NextResponse.json({ error: 'Round not found' }, { status: 404 });
      }
  
      const updatedQuestion = await prisma.question.update({
        where: { id: questionId },
        data: {
          text: questionData.text,
          type: questionData.type,
          // Correct answer is updated if provided
          correctAnswer: questionData.correctAnswer
            ? {
                update: {
                  answer: questionData.correctAnswer,
                },
              }
            : undefined,
        },
      });
  
      return NextResponse.json(updatedQuestion);
    } catch (error) {
      console.error('Error updating question:', error);
      return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
    }
  }
