// API: /api/teams/[teamId]/games

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Fetch all upcoming games for a specific team
export async function GET(req: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;

  try {
    const games = await prisma.game.findMany({
      where: {
        teams: {
          some: { id: teamId },
        },
        date: {
          gte: new Date(), // Filter for games on or after today
        },
      },
    });

    return NextResponse.json(games);
  } catch (error) {
    console.error('Error fetching games for team:', error);
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  }
}
