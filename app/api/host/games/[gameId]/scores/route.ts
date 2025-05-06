import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/host/games/[gameId]/scores
 * Returns: [{ teamId, score }]
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  /* 1. sum awardedPoints for each team with correct answers */
  const grouped = await prisma.answer.groupBy({
    by: ['teamGameId'],
    where: { teamGame: { gameId }, isCorrect: true },
    _sum: { awardedPoints: true },
  });

  if (grouped.length === 0) {
    return NextResponse.json([]); // no scores yet
  }

  /* 2. map teamGameId -> teamId */
  const teamIds = await prisma.teamGame.findMany({
    where: { id: { in: grouped.map(g => g.teamGameId) } },
    select: { id: true, teamId: true },
  });
  const tgMap = Object.fromEntries(teamIds.map(tg => [tg.id, tg.teamId]));

  const result = grouped.map(g => ({
    teamId: tgMap[g.teamGameId] ?? '',
    score:  g._sum.awardedPoints ?? 0,
  }));

  return NextResponse.json(result);
}
