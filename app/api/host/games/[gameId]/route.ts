import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { getUserFromProvidedToken } from '@/utils/auth';

const prisma = new PrismaClient();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
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
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        title: true,
        scheduledFor: true,
        status: true,
        joinCode: true,
        hostId: true,
        season: {
          select: {
            id: true,
            name: true,
            event: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Optional extra protection:
    // if HOST (not ADMIN), only allow access to their own assigned games
    if (user.role === 'HOST' && game.hostId && game.hostId !== user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      id: game.id,
      title: game.title,
      scheduledFor: game.scheduledFor,
      status: game.status,
      joinCode: game.joinCode,
      season: game.season
        ? {
          id: game.season.id,
          name: game.season.name,
        }
        : null,
      event: game.season?.event
        ? {
          id: game.season.event.id,
          name: game.season.event.name,
        }
        : null,
    });
  } catch (err) {
    console.error(
      'GET /api/host/games/[gameId] error:',
      err instanceof Error ? err.message : String(err)
    );

    return NextResponse.json({ error: 'Failed to load game' }, { status: 500 });
  }
}