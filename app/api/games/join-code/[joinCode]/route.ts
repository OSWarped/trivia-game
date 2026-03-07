// File: /app/api/games/join-code/[joinCode]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ joinCode: string }> }
) {
  const { joinCode } = await params;

  try {
    const game = await prisma.game.findUnique({
      where: { joinCode },
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
                    address: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: game.id,
      title: game.title,
      status: game.status,
      scheduledFor: game.scheduledFor,
      seasonId: game.season.id,
      seasonName: game.season.name,
      eventId: game.season.event.id,
      eventName: game.season.event.name,
      hostingSite: game.season.event.site ?? null,
    });
  } catch (err) {
    console.error(
      'Error loading game by join code:',
      err instanceof Error ? err.message : String(err)
    );

    return NextResponse.json(
      { error: 'Failed to load game' },
      { status: 500 }
    );
  }
}