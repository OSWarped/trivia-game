import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  try {
    const teamGames = await prisma.teamGame.findMany({
      where: { gameId },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const teams = teamGames.map(tg => ({
      id: tg.team.id,
      name: tg.team.name,
    }));

    return NextResponse.json({ teams });
  } catch (err) {
    console.error('Error fetching teams for game:', err);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}
