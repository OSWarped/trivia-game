import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request, { params }: { params: Promise<{ gameId: string, roundId: string, questionId: string }> }) {
  const { questionId } = await params; // Await the params to get the questionId
  const correctAnswerData = await req.json();

  try {
    // Create a correct answer for the specified question
    const newCorrectAnswer = await prisma.correctAnswer.create({
      data: {
        answer: correctAnswerData.answer, // The correct answer text
        questionId: questionId,           // Linking it to the questionId
      },
    });

    return NextResponse.json(newCorrectAnswer); // Return the newly created correct answer
  } catch (error) {
    console.error('Error creating correct answer:', error);
    return NextResponse.json({ error: 'Failed to create correct answer' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ gameId: string, roundId: string, questionId: string, correctAnswerId: string }> }) {
  const { correctAnswerId } = await params; // Await the params to get questionId and correctAnswerId
  const correctAnswerData = await req.json();

  try {
    // Update the correct answer associated with the question
    const updatedCorrectAnswer = await prisma.correctAnswer.update({
      where: { id: correctAnswerId },
      data: {
        answer: correctAnswerData.answer, // Updated answer text
      },
    });

    return NextResponse.json(updatedCorrectAnswer); // Return the updated correct answer
  } catch (error) {
    console.error('Error updating correct answer:', error);
    return NextResponse.json({ error: 'Failed to update correct answer' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ gameId: string, roundId: string, questionId: string, correctAnswerId: string }> }) {
  const { correctAnswerId } = await params; // Await the params to get correctAnswerId

  try {
    // Delete the correct answer associated with the question
    const deletedCorrectAnswer = await prisma.correctAnswer.delete({
      where: { id: correctAnswerId },
    });

    return NextResponse.json(deletedCorrectAnswer); // Return the deleted correct answer
  } catch (error) {
    console.error('Error deleting correct answer:', error);
    return NextResponse.json({ error: 'Failed to delete correct answer' }, { status: 500 });
  }
}
