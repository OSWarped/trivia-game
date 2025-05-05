// app/api/events/[id]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { name } = await req.json();
  const { eventId } = await params;
  if (!name) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 });
  }

  try {
    const updated = await prisma.event.update({
      where: { id: eventId },
      data: { name },
      include: { schedules: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('Error updating event:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ eventId: string }> },
  ) {
    const { eventId }  =await params;
    try {
      // cascade deletes schedules; Games/Seasons should have ON DELETE SET NULL or CASCADE as you prefer
      await prisma.event.delete({
        where: { id: eventId },
      });
      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error('Error deleting event:', err);
      return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
  }
