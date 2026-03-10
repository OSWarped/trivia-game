/* eslint-disable @typescript-eslint/no-unused-vars */
// app/api/host/games/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies }       from 'next/headers';
import { getUserFromProvidedToken } from '@/utils/auth';

const prisma = new PrismaClient();

export async function GET(_req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getUserFromProvidedToken(token);
  if (!user || (user.role !== 'HOST' && user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const games = await prisma.game.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        scheduledFor: true,
        season: {
          select: {
            id: true,
            name: true,
            event: {
              select: {
                id: true,
                name: true,
                site: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { scheduledFor: 'asc' },
    });

    const payload = games.map((game) => ({
      id: game.id,
      title: game.title,
      status: game.status,
      scheduledFor: game.scheduledFor,
      event: game.season?.event
        ? {
            id: game.season.event.id,
            name: game.season.event.name,
          }
        : null,
      site: game.season?.event?.site
        ? {
            id: game.season.event.site.id,
            name: game.season.event.site.name,
          }
        : null,
    }));

    return NextResponse.json(payload);
  } catch (err) {
    console.error('GET /api/host/games error:', err);
    return NextResponse.json(
      { error: 'Failed to load games' },
      { status: 500 }
    );
  }
}