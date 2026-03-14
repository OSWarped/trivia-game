import { GameStatus, PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const seasonId = id;

  try {
    const [standings, winCounts] = await Promise.all([
      prisma.teamGame.groupBy({
        by: ['teamId'],
        where: {
          game: {
            seasonId: id,
            status: GameStatus.CLOSED,
          },
        },
        _sum: {
          totalPts: true,
        },
        _count: {
          _all: true,
        },
      }),

      prisma.teamGame.groupBy({
        by: ['teamId'],
        where: {
          game: {
            seasonId,
            status: GameStatus.CLOSED,
          },
          rank: 1,
        },
        _count: {
          _all: true,
        },
      }),
    ]);

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
    const winsMap = new Map(
      winCounts.map((row) => [row.teamId, row._count._all])
    );

    const results = standings
      .map((row) => {
        const points = row._sum.totalPts ?? 0;
        const gamesPlayed = row._count._all;
        const wins = winsMap.get(row.teamId) ?? 0;

        return {
          teamId: row.teamId,
          team: teamNameMap.get(row.teamId) ?? 'Unknown',
          gamesPlayed,
          wins,
          points,
          averagePoints:
            gamesPlayed > 0 ? Number((points / gamesPlayed).toFixed(2)) : 0,
        };
      })
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.averagePoints !== a.averagePoints) {
          return b.averagePoints - a.averagePoints;
        }
        return a.team.localeCompare(b.team);
      })
      .map((row, index) => ({
        rank: index + 1,
        ...row,
      }));

    return NextResponse.json(results);
  } catch (err) {
    console.error('Error fetching standings:', err);
    return NextResponse.json(
      { error: 'Failed to fetch standings.' },
      { status: 500 }
    );
  }
}