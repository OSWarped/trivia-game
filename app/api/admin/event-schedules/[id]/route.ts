
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
const prisma = new PrismaClient();

/* ---------- PUT / DELETE  /admin/event-schedules/[id] --------- */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const updated = await prisma.eventSchedule.update({
    where: { id: id },
    data: body,
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.eventSchedule.delete({ where: { id: id } });
  return NextResponse.json({ ok: true });
}
