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
      orderBy: {
        sortOrder: 'asc', // Ensure questions are ordered by sortOrder in ascending order
      },
      include: {
        correctAnswer: true, // Include correct answer for the question
        subquestions: {
          include: {
            correctAnswer: true, // Include correct answer for each subquestion
          },
        },
      },
    });
    

    return NextResponse.json(questions.length > 0 ? questions : []);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ gameId: string, roundId: string }> }) {
  const { roundId } = await params;
  const questionData = await req.json();

  try {
    console.log('Received payload:', questionData);

    // Validate required fields
    if (!questionData.text || typeof questionData.text !== 'string') {
      throw new Error('Invalid or missing question text');
    }
    if (!['SINGLE', 'MULTIPLE_CHOICE', 'ORDERED', 'WAGER', 'IMAGE'].includes(questionData.type)) {
      throw new Error('Invalid or missing question type');
    }

    // Step 1: Create the Question
    const newQuestion = await prisma.question.create({
      data: {
        text: questionData.text,
        type: questionData.type,
        sortOrder: questionData.sortOrder,
        roundId: roundId,
      },
    });
    console.log('Created question:', newQuestion);

    // Step 2: Create CorrectAnswer if provided
    if (questionData.correctAnswer) {
      const correctAnswer = await prisma.correctAnswer.create({
        data: {
          answer: questionData.correctAnswer,
          questionId: newQuestion.id, // Link the correct answer to the question
        },
      });
      console.log('Created correct answer:', correctAnswer);
    }

    // Step 3: Create Subquestions if provided
    if (Array.isArray(questionData.subquestions) && questionData.subquestions.length > 0) {
      for (const sub of questionData.subquestions) {
        const subquestion = await prisma.subquestion.create({
          data: {
            text: sub.text,
            questionId: newQuestion.id, // Link to the parent question
            correctAnswer: sub.correctAnswer
              ? {
                  create: {
                    answer: sub.correctAnswer,
                  },
                }
              : undefined,
          },
        });
        console.log('Created subquestion:', subquestion);
      }
    }

    // Return the new Question
    return NextResponse.json(newQuestion);
  } catch (error) {
    // Type guard to check if error is an instance of Error
    if (error instanceof Error) {
      console.error('Error creating question:', error.message);
      return NextResponse.json({ error: error.message || 'Failed to create question' }, { status: 500 });
    } else {
      console.error('Unknown error occurred:', error);
      return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
    }
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
          sortOrder: questionData.sortOrder,
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
