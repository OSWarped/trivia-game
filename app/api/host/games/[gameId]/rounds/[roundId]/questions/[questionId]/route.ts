import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const { questionId } = await params;

  try {
    const question = await prisma.question.findUnique({
      where: {
        id: questionId,
      },
      include: {
        correctAnswer: true, // Include the correct answer for the main question (if applicable)
        answers: true, // Include submitted answers for the main question
        subquestions: {
          include: {
            correctAnswer: true, // Include the correct answers for subquestions
            subAnswers: true, // Include submitted answers for subquestions
          },
        },
        round: true, // Include the associated round
      },
    });

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Format the response to include subquestions with their respective correct answers
    const response = {
      ...question,
      subquestions: question.subquestions.map((subquestion) => ({
        ...subquestion,
        correctAnswer: subquestion.correctAnswer?.answer || null,
        subAnswers: subquestion.subAnswers || [],
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching question:', error);
    return NextResponse.json({ error: 'Failed to fetch question' }, { status: 500 });
  }
}


export async function PUT(req: Request, { params }: { params: Promise<{ questionId: string }> }) {
  const { questionId } = await params;

  try {
    const body = await req.json(); // Parse the request payload

    // Extract the first answer for the correct answer
    const correctAnswer = body.answers?.[0];

    // Update the question data
    const updatedQuestion = await prisma.question.update({
      where: {
        id: questionId,
      },
      data: {
        text: body.text,
        type: body.type,
        pointValue: body.pointValue,
        roundId: body.roundId,
        sortOrder: body.sortOrder,
        updatedAt: new Date(),
      },
    });

    // Handle the correct answer logic
    if (correctAnswer) {
      const existingCorrectAnswer = await prisma.correctAnswer.findUnique({
        where: {
          questionId: questionId,
        },
      });

      if (existingCorrectAnswer) {
        // Update the existing correct answer
        await prisma.correctAnswer.update({
          where: {
            id: existingCorrectAnswer.id,
          },
          data: {
            answer: correctAnswer,
          },
        });
      } else {
        // Create a new correct answer if it doesn't exist
        await prisma.correctAnswer.create({
          data: {
            answer: correctAnswer,
            questionId: questionId,
          },
        });
      }
    }

    return NextResponse.json(updatedQuestion);
  } catch (error) {
    console.error('Error updating question:', error);
    return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ questionId: string }> }) {
  const { questionId } = await params;

  try {
    await prisma.question.delete({
      where: {
        id: questionId, // Delete question by ID
      },
    });

    return NextResponse.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error);
    return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 });
  }
}
