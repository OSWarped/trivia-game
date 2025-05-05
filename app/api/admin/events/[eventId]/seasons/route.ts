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
    const { name, startsAt, endsAt, recurring } = await req.json();
  
    if (!name || !startsAt) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }
  
    try {
      const season = await prisma.season.create({
        data: {
          eventId:  eventId,
          name,
          startsAt: new Date(startsAt),
          endsAt:   endsAt ? new Date(endsAt) : null,
          recurring: recurring ?? false,
          active:    true,
        },
      });
      return NextResponse.json(season, { status: 201 });
    } catch (err) {
      console.error('Error creating season:', err);
      return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
  }
  
