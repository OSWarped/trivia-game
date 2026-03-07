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
  const { name } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 });
  }

  try {
    const updated = await prisma.event.update({
      where: { id: eventId },
      data: { name: name.trim() },
      include: { schedules: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('Error updating event:', err);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;

  try {
    await prisma.event.delete({
      where: { id: eventId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error deleting event:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}