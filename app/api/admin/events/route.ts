import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function isUpcoming(value: Date | null): boolean {
  return !!value && value.getTime() >= Date.now();
}

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      orderBy: [{ site: { name: 'asc' } }, { name: 'asc' }],
      include: {
        site: {
          select: {
            id: true,
            name: true,
          },
        },
        seasons: {
          select: {
            id: true,
            games: {
              select: {
                id: true,
                scheduledFor: true,
              },
            },
          },
        },
      },
    });

    const payload = events.map((event) => {
      const games = event.seasons.flatMap((season) => season.games);

      return {
        id: event.id,
        name: event.name,
        siteId: event.site.id,
        siteName: event.site.name,
        seasonCount: event.seasons.length,
        gameCount: games.length,
        upcomingCount: games.filter((game) => isUpcoming(game.scheduledFor)).length,
      };
    });

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load events.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      siteId?: string;
      name?: string;
    };

    const siteId = body.siteId?.trim();
    const name = body.name?.trim();

    if (!siteId) {
      return NextResponse.json({ error: 'Site is required.' }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: 'Event name is required.' }, { status: 400 });
    }

    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { id: true },
    });

    if (!site) {
      return NextResponse.json({ error: 'Selected site was not found.' }, { status: 404 });
    }

    const created = await prisma.event.create({
      data: {
        siteId,
        name,
      },
      include: {
        site: {
          select: {
            id: true,
            name: true,
          },
        },
        seasons: {
          select: {
            id: true,
            games: {
              select: {
                id: true,
                scheduledFor: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      id: created.id,
      name: created.name,
      siteId: created.site.id,
      siteName: created.site.name,
      seasonCount: created.seasons.length,
      gameCount: 0,
      upcomingCount: 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create event.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
