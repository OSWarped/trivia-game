// app/api/admin/seasons/[seasonId]/standings/route.ts
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(
  _req: Request,
  context: Promise<{ params: { seasonId: string } }>
) {
  const { params } = await context;            // ✅ await
  try {
    // aggregate totals by team across games in this season
    const standings = await prisma.teamGame.groupBy({
      by: ['teamId'],
      where: { game: { seasonId: params.seasonId } },
      _sum: { totalPts: true },
      _count: { _all: true },
      orderBy: { _sum: { totalPts: 'desc' } },
    });

    // join team names
    const withNames = await Promise.all(
      standings.map(async s => ({
        teamId:  s.teamId,
        games:   s._count._all,
        points:  s._sum.totalPts,
        team:    await prisma.team.findUnique({
          where:{ id: s.teamId },
          select:{ name:true },
        }).then(t => t?.name ?? 'Unknown'),
      })),
    );

    return NextResponse.json(withNames);
  } catch (err) {
    console.error('Error fetching standings:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
