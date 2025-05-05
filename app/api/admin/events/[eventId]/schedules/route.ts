/* ---------- POST  /admin/events/[eventId]/schedules  ---------- */
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
const prisma = new PrismaClient();

export async function POST(
  req: Request,
  context: Promise<{ params: { eventId: string } }>
) {
  const { params } = await context;
  const body = await req.json(); // { freq, dow?, nthDow?, dayOfMonth?, timeUTC }

  try {
    const row = await prisma.eventSchedule.create({
      data: { ...body, eventId: params.eventId },
    });
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 400 });
  }
}

