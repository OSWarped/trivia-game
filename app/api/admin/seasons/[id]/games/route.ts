import { GameStatus, PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

function generateJoinCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';

  for (let i = 0; i < length; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

async function generateUniqueJoinCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const joinCode = generateJoinCode();

    const existing = await prisma.game.findUnique({
      where: { joinCode },
      select: { id: true },
    });

    if (!existing) {
      return joinCode;
    }
  }

  throw new Error('Failed to generate a unique join code.');
}

function toGameRow(game: {
  id: string;
  title: string;
  joinCode: string;
  status: string;
  scheduledFor: Date | null;
  special: boolean;
  tag: string | null;
  host: { id: string; name: string | null } | null;
  season: {
    id: string;
    name: string;
    event: {
      id: string;
      name: string;
      site: {
        id: string;
        name: string;
      };
    };
  };
}) {
  return {
    id: game.id,
    title: game.title,
    siteId: game.season.event.site.id,
    siteName: game.season.event.site.name,
    eventId: game.season.event.id,
    eventName: game.season.event.name,
    seasonId: game.season.id,
    seasonName: game.season.name,
    scheduledFor: game.scheduledFor ? game.scheduledFor.toISOString() : null,
    status: game.status,
    hostId: game.host?.id ?? null,
    hostName: game.host?.name ?? null,
    joinCode: game.joinCode,
    special: game.special,
    tag: game.tag,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: seasonId } = await params;

  try {
    const games = await prisma.game.findMany({
      where: { seasonId },
      orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        title: true,
        joinCode: true,
        special: true,
        tag: true,
        status: true,
        scheduledFor: true,
        host: {
          select: {
            id: true,
            name: true,
          },
        },
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
    });

    return NextResponse.json(games.map(toGameRow));
  } catch (err) {
    console.error(
      'Error fetching season games:',
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json({ error: 'Failed to load season games' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: seasonId } = await params;

  const body = (await req.json()) as {
    title?: string;
    scheduledFor?: string | null;
    special?: boolean;
    tag?: string | null;
    hostId?: string | null;
  };

  const title = body.title?.trim();
  const tag = body.tag?.trim() || null;

  if (!title) {
    return NextResponse.json({ error: 'Game title is required' }, { status: 400 });
  }

  try {
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      select: {
        id: true,
        name: true,
        event: {
          select: {
            id: true,
            name: true,
            siteId: true,
            site: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }

    const joinCode = await generateUniqueJoinCode();

    const created = await prisma.game.create({
      data: {
        seasonId,
        siteId: season.event.siteId,
        title,
        joinCode,
        special: body.special ?? false,
        tag: body.special ? tag : null,
        hostId: body.hostId ?? null,
        status: body.scheduledFor ? GameStatus.SCHEDULED : GameStatus.DRAFT,
        scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : null,
      },
      select: {
        id: true,
        title: true,
        joinCode: true,
        special: true,
        tag: true,
        status: true,
        scheduledFor: true,
        host: {
          select: {
            id: true,
            name: true,
          },
        },
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
    });

    return NextResponse.json(toGameRow(created), { status: 201 });
  } catch (err) {
    console.error(
      'Error creating game for season:',
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
  }
}
