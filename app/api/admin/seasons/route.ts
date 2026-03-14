import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function isUpcoming(value: Date | null): boolean {
  return !!value && value.getTime() >= Date.now();
}

function minDate(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a.getTime() <= b.getTime() ? a : b;
}

function maxDate(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a.getTime() >= b.getTime() ? a : b;
}

export async function GET() {
  try {
    const seasons = await prisma.season.findMany({
      orderBy: [{ event: { site: { name: 'asc' } } }, { event: { name: 'asc' } }, { name: 'asc' }],
      include: {
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
        games: {
          select: {
            id: true,
            scheduledFor: true,
            status: true,
          },
        },
      },
    });

    const payload = seasons.map((season) => {
      const firstScheduledFor = season.games.reduce<Date | null>(
        (earliest, game) => minDate(earliest, game.scheduledFor),
        season.startsAt ?? null
      );
      const lastScheduledFor = season.games.reduce<Date | null>(
        (latest, game) => maxDate(latest, game.scheduledFor),
        season.endsAt ?? season.startsAt ?? null
      );

      return {
        id: season.id,
        name: season.name,
        eventId: season.event.id,
        eventName: season.event.name,
        siteId: season.event.site.id,
        siteName: season.event.site.name,
        gameCount: season.games.length,
        upcomingCount: season.games.filter((game) => isUpcoming(game.scheduledFor)).length,
        liveCount: season.games.filter((game) => game.status.toUpperCase() === 'LIVE').length,
        firstScheduledFor: firstScheduledFor?.toISOString() ?? null,
        lastScheduledFor: lastScheduledFor?.toISOString() ?? null,
      };
    });

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load seasons.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      eventId?: string;
      name?: string;
      startsAt?: string | null;
      endsAt?: string | null;
      active?: boolean;
    };

    const eventId = body.eventId?.trim();
    const name = body.name?.trim();

    if (!eventId) {
      return NextResponse.json({ error: 'Event is required.' }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: 'Season name is required.' }, { status: 400 });
    }

    const created = await prisma.season.create({
      data: {
        eventId,
        name,
        startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        active: typeof body.active === 'boolean' ? body.active : true,
      },
      include: {
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
    });

    return NextResponse.json({
      id: created.id,
      name: created.name,
      eventId: created.event.id,
      eventName: created.event.name,
      siteId: created.event.site.id,
      siteName: created.event.site.name,
      gameCount: 0,
      upcomingCount: 0,
      liveCount: 0,
      firstScheduledFor: created.startsAt?.toISOString() ?? null,
      lastScheduledFor: created.endsAt?.toISOString() ?? created.startsAt?.toISOString() ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create season.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
