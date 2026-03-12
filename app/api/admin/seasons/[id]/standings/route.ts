import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  const { seasonId } = await params;

  try {
    const standings = await prisma.teamGame.groupBy({
      by: ['teamId'],
      where: {
        game: {
          seasonId,
          status: 'CLOSED',
        },
      },
      _sum: {
        totalPts: true,
      },
      _count: {
        gameId: true,
      },
      orderBy: {
        _sum: {
          totalPts: 'desc',
        },
      },
    });

    const teamIds = standings.map((row) => row.teamId);

    const teams = await prisma.team.findMany({
      where: {
        id: { in: teamIds },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const teamNameMap = new Map(teams.map((team) => [team.id, team.name]));

    const results = standings.map((row, index) => {
      const points = row._sum?.totalPts ?? 0;
      const gamesPlayed = row._count?.gameId ?? 0;

      return {
        rank: index + 1,
        teamId: row.teamId,
        team: teamNameMap.get(row.teamId) ?? 'Unknown',
        gamesPlayed,
        points,
        averagePoints:
          gamesPlayed > 0 ? Number((points / gamesPlayed).toFixed(2)) : 0,
      };
    });

    return NextResponse.json(results);
  } catch (err) {
    console.error('Error fetching standings:', err);
    return NextResponse.json(
      { error: 'Failed to fetch standings.' },
      { status: 500 }
    );
  }
}