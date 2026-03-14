import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const seasonId = id;

    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      select: {
        id: true,
        name: true,
        startsAt: true,
        endsAt: true,
        active: true,
        championGameId: true,
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

    if (!season) {
      return NextResponse.json({ error: 'Season not found.' }, { status: 404 });
    }

    return NextResponse.json(season);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load season.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const seasonId = id;
    const body = (await req.json()) as {
      eventId?: string;
      name?: string;
      startsAt?: string | null;
      endsAt?: string | null;
      active?: boolean;
      championGameId?: string | null;
    };

    const eventId = body.eventId?.trim();
    const name = body.name?.trim();

    if (!eventId) {
      return NextResponse.json({ error: 'Event is required.' }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: 'Season name is required.' }, { status: 400 });
    }

    const season = await prisma.season.update({
      where: { id: seasonId },
      data: {
        eventId,
        name,
        startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        active: typeof body.active === 'boolean' ? body.active : true,
        championGameId: body.championGameId?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        startsAt: true,
        endsAt: true,
        active: true,
        championGameId: true,
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

    return NextResponse.json(season);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update season.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const seasonId = id;

    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      select: {
        _count: {
          select: {
            games: true,
          },
        },
      },
    });

    if (!season) {
      return NextResponse.json({ error: 'Season not found.' }, { status: 404 });
    }

    if (season._count.games > 0) {
      return NextResponse.json(
        { error: 'This season cannot be deleted while it still has games attached.' },
        { status: 400 }
      );
    }

    await prisma.season.delete({ where: { id: seasonId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete season.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
