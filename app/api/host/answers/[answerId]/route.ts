import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers'; // Import for accessing cookies
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ answerId: string }> }
) {
  const { answerId } = await params; // Await the params promise
  const { isCorrect, pointsAwarded } = await req.json();

  if (typeof isCorrect !== 'boolean' || typeof pointsAwarded !== 'number') {
    return NextResponse.json(
      { error: 'Invalid input: isCorrect and pointsAwarded are required' },
      { status: 400 }
    );
  }

  try {
    // Retrieve token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Authorization token is missing' },
        { status: 401 }
      );
    }

    // Verify the token
    const user = jwt.verify(token, SECRET_KEY) as { id: string; roles: string[] };

    if (!user.roles.includes('HOST')) {
      return NextResponse.json(
        { error: 'Unauthorized access. Only hosts can update answers.' },
        { status: 403 }
      );
    }

    // Update the answer in the database
    const updatedAnswer = await prisma.answer.update({
      where: { id: answerId },
      data: {
        isCorrect,
        awardedPoints: pointsAwarded,
      },
    });

    return NextResponse.json({
      message: 'Answer updated successfully',
      answer: updatedAnswer,
    });
  } catch (error) {
    console.error('Error updating answer:', error);

    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to update answer' },
      { status: 500 }
    );
  }
}
