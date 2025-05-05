import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/* ── PATCH : rename or toggle active ─────────────────────────── */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
    const {id} = await params;
  const { name, active } = await req.json();

  try {
    const updated = await prisma.season.update({
      where: { id: id },
      data: {
        ...(name   !== undefined ? { name }   : {}),
        ...(active !== undefined ? { active } : {}),
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('Failed to patch season:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

/* ── DELETE : remove season (cascades games.seasonId = NULL) ── */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
    const {id} = await params;
  try {
    await prisma.season.delete({ where: { id: id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete season:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
