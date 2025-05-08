/* eslint-disable @typescript-eslint/no-unused-vars */
// app/api/host/games/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies }       from 'next/headers';
import { getUserFromProvidedToken } from '@/utils/auth';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  // Extract token from cookie
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Validate user and role
  const user = await getUserFromProvidedToken(token);
  if (!user || (user.role !== 'HOST' && user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Fetch all games, ordered by scheduledFor
    const games = await prisma.game.findMany({
      select: {
        id:           true,
        title:        true,
        status:       true,
        scheduledFor: true,
      },
      orderBy: { scheduledFor: 'asc' },
    });

    return NextResponse.json(games);
  } catch (err) {
    console.error('GET /api/host/games error:', err);
    return NextResponse.json({ error: 'Failed to load games' }, { status: 500 });
  }
}
