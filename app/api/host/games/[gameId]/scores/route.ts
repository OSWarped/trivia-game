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

  const grouped = await prisma.answer.groupBy({
    by: ['teamGameId'],
    where: {
      teamGame: { gameId },
    },
    _sum: { awardedPoints: true },
  });

  const teamGames = await prisma.teamGame.findMany({
    where: { gameId },
    select: {
      id: true,
      teamId: true,
    },
  });

  const groupedMap = Object.fromEntries(
    grouped.map((g) => [g.teamGameId, g._sum.awardedPoints ?? 0])
  );

  const result = teamGames.map((tg) => ({
    teamId: tg.teamId,
    score: groupedMap[tg.id] ?? 0,
  }));

  return NextResponse.json(result);
}
