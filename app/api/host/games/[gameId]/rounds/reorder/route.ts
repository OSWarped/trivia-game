/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies }      from 'next/headers';
import { getUserFromProvidedToken } from '@/utils/auth';

const prisma = new PrismaClient();

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ gameId: string } >}
) {
  // auth
  const { gameId } = await params;
  
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await getUserFromProvidedToken(token);
  if (!user || !['HOST','ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // parse body
  const { order } = await req.json() as { order: string[] };
  if (!Array.isArray(order)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // map to update data
  const updates = order.map((roundId, idx) =>
    prisma.round.update({
      where: { id: roundId },
      data:  { sortOrder: idx + 1 },
    })
  );

  try {
    await prisma.$transaction(updates);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error reordering rounds:', err);
    return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 });
  }
}
