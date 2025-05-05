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
        team: true,
      },
    });

    const teams = teamGames.map((tg) => ({
      id: tg.team.id,
      name: tg.team.name,
    }));

    return NextResponse.json(teams);
  } catch (err) {
    console.error('Failed to load teams:', err);
    return NextResponse.json({ error: 'Failed to load teams' }, { status: 500 });
  }
}
