//api/host/games/[gameId]/answers/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/host/games/[gameId]/answers?questionId=...
 * → [
 *     {
 *       teamId,
 *       teamName,
 *       given,
 *       pointsUsed,   // int[]
 *       isCorrect     // true | false | null
 *     },
 *     ...
 *   ]
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const questionId = new URL(req.url).searchParams.get('questionId');

  if (!questionId) {
    return NextResponse.json(
      { error: 'questionId query param is required' },
      { status: 400 }
    );
  }

  try {
    /* 1. fetch all answers for this question within the game */
    const answers = await prisma.answer.findMany({
      where: {
        questionId,
        teamGame: { gameId },      // join via TeamGame relation
      },
      include: {
        teamGame: {
          select: {
            teamId: true,
            team: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    /* 2. shape the payload for the host UI */
    const payload = answers.map((a) => ({
    teamId: a.teamGame.teamId,
    teamName: a.teamGame.team.name,
    questionId: a.questionId,      // ← now included!
    given: a.given,
    isCorrect: a.isCorrect,
    awardedPoints: a.awardedPoints,
    pointsUsed: a.pointsUsed ?? 0
  }));


    return NextResponse.json(payload);
  } catch (err) {
    console.error('Error fetching answers:', err);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
