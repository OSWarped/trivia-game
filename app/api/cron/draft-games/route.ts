import { NextResponse }    from 'next/server';
import { PrismaClient }    from '@prisma/client';
import { getISOWeek }      from 'date-fns';

export const config = {
  runtime:  'edge',
  // run every day at 00:05 UTC
  schedule: '5 0 * * *',
};

const prisma = new PrismaClient();

// helper: check bi-weekly parity based on ISO week number
function isBiweekAllowed(dow: number): boolean {
  const week = getISOWeek(new Date());
  // toggle even/odd weeks however you like; here, even weeks host when dow is even
  return (week % 2) === 0;
}

export default async function handler() {
  const today = new Date();
  const todayDow = today.getUTCDay();      // 0‒6
  const dateStart = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
    0,0,0
  );

  // 1) load all schedules + their active event + its active season
  const schedules = await prisma.eventSchedule.findMany({
    include: {
      event: {
        include: {
          seasons: { where: { active: true } }
        }
      }
    }
  });

  for (const sch of schedules) {
    let shouldDraft = false;
    if (sch.freq === 'WEEKLY') {
      shouldDraft = sch.dow === todayDow;
    } else if (sch.freq === 'BIWEEKLY') {
      shouldDraft = sch.dow === todayDow && isBiweekAllowed(sch.dow!);
    } else if (sch.freq === 'MONTHLY') {
      const dom = today.getUTCDate();
      if (sch.dayOfMonth) {
        shouldDraft = dom === sch.dayOfMonth;
      } else if (sch.nthDow !== null) {
        // compute nth weekday of month
        const first = new Date(today.getUTCFullYear(), today.getUTCMonth(), 1);
        const firstDow = first.getUTCDay();
        // offset to first occurrence of sch.dow
        let day = 1 + ((7 + sch.dow! - firstDow) % 7) + (sch.nthDow! - 1) * 7;
        shouldDraft = dom === day;
      }
    }

    if (!shouldDraft) continue;

    // build the scheduled DateTime from today + timeUTC
    const [hh, mm] = sch.timeUTC.split(':').map(Number);
    const scheduled = new Date(Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
      hh, mm, 0
    ));

    // 2) check if a Game already exists for this event at that time
    const exists = await prisma.game.findFirst({
      where: {
        eventId:      sch.eventId,
        scheduledFor: scheduled,
      }
    });
    if (exists) continue;

    // 3) pick the first active season if any
    const season = sch.event.seasons[0];

    // 4) draft the Game
    await prisma.game.create({
      data: {
        eventId:      sch.eventId,
        seasonId:     season ? season.id : undefined,
        hostId:       sch.event.siteId,       // or leave blank / use default
        title:        sch.event.name,
        scheduledFor: scheduled,
        status:       'DRAFT',
      }
    });
  }

  return NextResponse.json({ drafted: true });
}
