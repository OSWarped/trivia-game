/* ---------- POST  /admin/events/[eventId]/schedules  ---------- */
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
//import { URLSearchParams } from 'node:url';
const prisma = new PrismaClient();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const body = await req.json(); // { freq, dow?, nthDow?, dayOfMonth?, timeUTC }

  try {
    const row = await prisma.eventSchedule.create({
      data: { ...body, eventId: eventId },
    });
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed', err }, { status: 400 });
  }
}

