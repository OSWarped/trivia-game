import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();
const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

export async function POST(req: Request) {
  try {
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
        { error: 'Unauthorized access. Only hosts can query answers.' },
        { status: 403 }
      );
    }

    // Parse the request body
    const { questionId, teamId } = await req.json();

    if (!questionId || !teamId) {
      return NextResponse.json(
        { error: 'Missing required fields: questionId and teamId' },
        { status: 400 }
      );
    }

    // Fetch the answer
    const answer = await prisma.answer.findFirst({
      where: { questionId, teamId },
    });

    if (!answer) {
      return NextResponse.json({ error: 'Answer not found' }, { status: 404 });
    }

    return NextResponse.json({
      answerId: answer.id,
      pointsUsed: answer.pointsUsed,
    });
  } catch (error) {
    console.error('Error fetching answer:', error);

    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch answer' },
      { status: 500 }
    );
  }
}
