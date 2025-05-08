//api/host/answers/[answerId]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();
const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const gameId     = searchParams.get('gameId');
  const teamId     = searchParams.get('teamId');
  const questionId = searchParams.get('questionId');

  if (!gameId || !teamId || !questionId) {
    return NextResponse.json(
      { error: 'Missing gameId, teamId, or questionId' },
      { status: 400 }
    );
  }

  try {
    /* confirm the team belongs to the game */
    const teamGame = await prisma.teamGame.findUnique({
      where: { teamId_gameId: { teamId, gameId } },
      select: { id: true, team: { select: { id: true, name: true } } },
    });
    if (!teamGame) {
      return NextResponse.json(
        { error: 'Team not found in game' },
        { status: 404 }
      );
    }

    /* fetch THAT team's answer for THAT question */
    const answerRow = await prisma.answer.findFirst({
      where: { teamGameId: teamGame.id, questionId },
      orderBy: { createdAt: 'desc' },          // in case of resubmissions
      select: {
        given: true,
        awardedPoints: true,
        isCorrect: true,
        pointsUsed: true,
      },
    });

    if (!answerRow) return NextResponse.json({ answer: null });

    const answer = {
      teamId:   teamGame.team.id,
      teamName: teamGame.team.name,
      questionId,
      given: answerRow.given,
      awardedPoints: answerRow.awardedPoints,
      isCorrect: answerRow.isCorrect,
      pointsUsed: answerRow.pointsUsed,
    };

    return NextResponse.json({ answer });
  } catch (err) {
    console.error('Error fetching team answer:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
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
      where: {
        questionId,
        teamGame: {
          teamId, // ✅ nested query through the relation
        },
      },
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
