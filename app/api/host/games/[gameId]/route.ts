// app/api/host/games/[gameId]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies }       from 'next/headers';
import { getUserFromProvidedToken } from '@/utils/auth';

const prisma = new PrismaClient();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  // 1. Authenticate via token cookie
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = await getUserFromProvidedToken(token);
  if (!user || (user.role !== 'HOST' && user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { gameId } = await params;

  try {
    // 2. Fetch game details
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        title: true,
        scheduledFor: true,
        status: true,
        joinCode: true,
        event: {
          select: { id: true, name: true }
        },
        season: {
          select: { id: true, name: true }
        }
      }
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // 3. Return sanitized game object
    return NextResponse.json({
      id:           game.id,
      title:        game.title,
      scheduledFor: game.scheduledFor,
      status:       game.status,
      joinCode:     game.joinCode,
      event:        game.event,
      season:       game.season
    });
  } catch (err) {
    console.error('GET /api/host/games/[gameId] error:', err);
    return NextResponse.json({ error: 'Failed to load game' }, { status: 500 });
  }
}
