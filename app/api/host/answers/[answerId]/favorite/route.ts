import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ answerId: string }> }) {
  const { answerId } = await params;
  let body: { favorite?: boolean };
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON', err }, { status: 400 });
  }

  const { favorite } = body;
  if (typeof favorite !== 'boolean') {
    return NextResponse.json(
      { error: 'Missing or invalid "favorite" boolean in request body' },
      { status: 400 }
    );
  }

  try {
    // Update favorite flag
    await prisma.answer.update({
      where: { id: answerId },
      data: { favorite }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error updating favorite:', err);
    return NextResponse.json(
      { error: err || 'Server error' },
      { status: 500 }
    );
  }
}