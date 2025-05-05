
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
const prisma = new PrismaClient();

/* ---------- PUT / DELETE  /admin/event-schedules/[id] --------- */
export async function PUT(
  req: Request,
  context: Promise<{ params: { id: string } }>
) {
  const { params } = await context;
  const body = await req.json();
  const updated = await prisma.eventSchedule.update({
    where: { id: params.id },
    data: body,
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  context: Promise<{ params: { id: string } }>
) {
  const { params } = await context;
  await prisma.eventSchedule.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
