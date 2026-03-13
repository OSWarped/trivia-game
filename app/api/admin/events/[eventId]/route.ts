import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;

  if (!eventId) {
    return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        site: {
          select: {
            id: true,
            name: true,
          },
        },
        seasons: {
          orderBy: [
            { active: 'desc' },
            { startsAt: 'desc' },
          ],
          select: {
            id: true,
            name: true,
            startsAt: true,
            endsAt: true,
            active: true,
            _count: {
              select: {
                games: true,
              },
            },
            games: {
              orderBy: [
                { scheduledFor: 'desc' },
                { createdAt: 'desc' },
              ],
              take: 3,
              select: {
                id: true,
                title: true,
                scheduledFor: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: event.id,
      name: event.name,
      site: {
        id: event.site.id,
        name: event.site.name,
      },
      seasons: event.seasons.map((season) => ({
        id: season.id,
        name: season.name,
        startsAt: season.startsAt,
        endsAt: season.endsAt,
        active: season.active,
        gameCount: season._count.games,
        games: season.games,
      })),
    });
  } catch (err) {
    console.error(
      'Error fetching event overview:',
      err instanceof Error ? err.message : err
    );

    return NextResponse.json(
      { error: 'Failed to load event' },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const body = (await req.json()) as {
    name?: string;
    siteId?: string | null;
  };

  const name = body.name?.trim();
  const siteId = body.siteId?.trim() ?? null;

  if (!name) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 });
  }

  if (!siteId) {
    return NextResponse.json({ error: 'Site required' }, { status: 400 });
  }

  try {
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { id: true },
    });

    if (!site) {
      return NextResponse.json(
        { error: 'Selected site not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        name,
        siteId,
      },
      include: {
        site: true,
        schedules: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('Error updating event:', err);
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;

  try {
    const seasonCount = await prisma.season.count({
      where: { eventId },
    });

    if (seasonCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete an event that still has seasons' },
        { status: 400 }
      );
    }

    await prisma.event.delete({
      where: { id: eventId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error deleting event:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}