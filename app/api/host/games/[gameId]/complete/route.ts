import { GameStatus, PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  try {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== GameStatus.LIVE) {
      return NextResponse.json(
        { error: 'Game must be LIVE before completing.' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const teamGames = await tx.teamGame.findMany({
        where: { gameId },
        orderBy: [
          { totalPts: 'desc' },
          { teamId: 'asc' }, // stable ordering for ties
        ],
        select: {
          id: true,
          totalPts: true,
          teamId: true,
        },
      });

      let lastScore: number | null = null;
      let lastRank = 0;

      const rankedTeamGames = teamGames.map((teamGame, index) => {
        const position = index + 1;

        // Standard competition ranking:
        // 1, 1, 3, 4
        if (lastScore === null || teamGame.totalPts < lastScore) {
          lastRank = position;
          lastScore = teamGame.totalPts;
        }

        return {
          id: teamGame.id,
          rank: lastRank,
        };
      });

      await Promise.all(
        rankedTeamGames.map((teamGame) =>
          tx.teamGame.update({
            where: { id: teamGame.id },
            data: { rank: teamGame.rank },
          })
        )
      );

      const updatedGame = await tx.game.update({
        where: { id: gameId },
        data: {
          status: GameStatus.CLOSED,
          endedAt: new Date(),
        },
      });

      return {
        game: updatedGame,
        rankedTeamGames,
      };
    });

    return NextResponse.json({
      message: 'Game marked as completed and ranks assigned.',
      game: result.game,
      ranksAssigned: result.rankedTeamGames.length,
    });
  } catch (error) {
    console.error('Error completing game:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}