import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/host/results?gameId=...
 * Returns final standings and favorite answers for the host.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const gameId = searchParams.get('gameId');

  if (!gameId) {
    return NextResponse.json({ error: 'Missing gameId' }, { status: 400 });
  }

  try {
    // 1. Fetch game metadata
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        title: true,
        scheduledFor: true,
        status: true,
      },
    });
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // 2. Load each team's performance and favorites
    const teamGames = await prisma.teamGame.findMany({
      where: { gameId },
      include: {
        team: { select: { id: true, name: true } },
        answers: {
          where: { favorite: true },
          select: { questionId: true, given: true },
          orderBy: { questionId: 'asc' },
        },
      },
      orderBy: { totalPts: 'desc' },
    });

    const totalTeams = teamGames.length;

    // 3. Assemble standings
    const teams = teamGames.map((tg, idx) => ({
      teamId: tg.team.id,
      teamName: tg.team.name,
      finalScore: tg.totalPts,
      rank: idx + 1,
      favorites: tg.answers.map(a => ({ questionId: a.questionId, yourAnswer: a.given })),
    }));

    // 4. Build response
    const payload = {
      game: {
        id: game.id,
        title: game.title,
        date: game.scheduledFor?.toISOString(),
        status: game.status,
      },
      teams,
      totalTeams,
    };

    return NextResponse.json(payload);
  } catch (err: any) {
    console.error('Error in host results API:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
