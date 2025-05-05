// app/api/events/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const body = await req.json();
  const { siteId, name, schedules } = body as {
    siteId: string;
    name: string;
    schedules: {
      freq: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
      dow?: number;
      nthDow?: number;
      dayOfMonth?: number;
      timeUTC: string;
    }[];
  };

  /* ✦ basic validation */
  if (!siteId || !name || !Array.isArray(schedules) || schedules.length === 0) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  try {
    const event = await prisma.event.create({
      data: {
        siteId,
        name,
        schedules: { create: schedules },
      },
      include: { schedules: true },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    console.error('Error creating event:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
