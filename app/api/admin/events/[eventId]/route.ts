import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { eventId } = await params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
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
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load event.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: RouteContext) {
  try {
    const { eventId } = await params;
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

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        siteId,
        name,
      },
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
    });

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update event.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { eventId } = await params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        _count: {
          select: {
            seasons: true,
            teamEvents: true,
            schedules: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }

    if (event._count.seasons > 0 || event._count.teamEvents > 0) {
      return NextResponse.json(
        {
          error:
            'This event cannot be deleted yet because it still has seasons or team history attached.',
        },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      if (event._count.schedules > 0) {
        await tx.eventSchedule.deleteMany({ where: { eventId } });
      }

      await tx.event.delete({ where: { id: eventId } });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete event.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
