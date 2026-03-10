import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await params;

  if (!siteId) {
    return NextResponse.json({ error: 'Missing siteId' }, { status: 400 });
  }

  try {
    const events = await prisma.event.findMany({
      where: { siteId },
      include: {
        schedules: true,
        seasons: {
          orderBy: { startsAt: 'desc' },
          include: {
            games: {
              select: { id: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const payload = events.map((event) => {
      const activeSeason =
        event.seasons.find((season) => season.active) ?? null;

      return {
        id: event.id,
        name: event.name,
        createdAt: event.createdAt,
        schedules: event.schedules.map((schedule) => ({
          id: schedule.id,
          freq: schedule.freq,
          dow: schedule.dow,
          nthDow: schedule.nthDow,
          dayOfMonth: schedule.dayOfMonth,
          timeUTC: schedule.timeUTC,
        })),
        seasonCount: event.seasons.length,
        activeSeason: activeSeason
          ? {
              id: activeSeason.id,
              name: activeSeason.name,
              startsAt: activeSeason.startsAt,
              endsAt: activeSeason.endsAt,
              active: activeSeason.active,
              gameCount: activeSeason.games.length,
            }
          : null,
      };
    });

    return NextResponse.json(payload);
  } catch (err) {
    console.error('Error fetching events for', siteId, err);
    return NextResponse.json(
      { error: 'Failed to load events' },
      { status: 500 },
    );
  }
}