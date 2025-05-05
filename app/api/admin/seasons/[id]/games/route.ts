// app/api/admin/seasons/[seasonId]/games/route.ts
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(
  _req: Request,
  context: Promise<{ params: { seasonId: string } }>
) {
  const { params } = await context;            // ✅ await lazy params
  try {
    const games = await prisma.game.findMany({
      where:  { seasonId: params.seasonId },
      orderBy:{ startedAt: 'asc' },
      select: {
        id:        true,
        title:     true,
        special:   true,
        tag:       true,
        status:    true,
        startedAt: true,
      },
    });
    return NextResponse.json(games);
  } catch (err) {
    console.error('Error fetching season games:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
