// app/api/events/[eventId]/seasons/route.ts
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
    const { eventId } = await params;
  try {
    const seasons = await prisma.season.findMany({
      where: { eventId: eventId },
      orderBy: { startsAt: 'asc' },
    });
    return NextResponse.json(seasons);
  } catch (err) {
    console.error('Error fetching seasons:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;

  const body = (await req.json()) as {
    name?: string;
    startsAt?: string;
    endsAt?: string | null;
    active?: boolean;
  };

  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json({ error: 'Season name is required' }, { status: 400 });
  }

  if (!body.startsAt) {
    return NextResponse.json({ error: 'Start date is required' }, { status: 400 });
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    let created;

    if (body.active === true) {
      [, created] = await prisma.$transaction([
        prisma.season.updateMany({
          where: { eventId },
          data: { active: false },
        }),
        prisma.season.create({
          data: {
            eventId,
            name,
            startsAt: new Date(body.startsAt),
            endsAt: body.endsAt ? new Date(body.endsAt) : null,
            active: true,
          },
          select: {
            id: true,
            name: true,
            startsAt: true,
            endsAt: true,
            active: true,
          },
        }),
      ]);
    } else {
      created = await prisma.season.create({
        data: {
          eventId,
          name,
          startsAt: new Date(body.startsAt),
          endsAt: body.endsAt ? new Date(body.endsAt) : null,
          active: false,
        },
        select: {
          id: true,
          name: true,
          startsAt: true,
          endsAt: true,
          active: true,
        },
      });
    }

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('Failed to create season:', err);
    return NextResponse.json({ error: 'Failed to create season' }, { status: 500 });
  }
}
  
