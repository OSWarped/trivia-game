import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { getUserFromProvidedToken } from '@/utils/auth';

const prisma = new PrismaClient();

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ roundId: string }> }
) {
  // Extract the roundId from the route params
  const { roundId } = await params;

  // Authenticate user
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getUserFromProvidedToken(token);
  if (!user || !['HOST', 'ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Parse and validate payload
  const { order } = (await req.json()) as { order: string[] };
  if (!Array.isArray(order)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // Prepare Prisma updates
  const updates = order.map((questionId, idx) =>
    prisma.question.update({
      where: { id: questionId, roundId },
      data: { sortOrder: idx + 1 },
    })
  );

  // Execute updates in a transaction
  try {
    await prisma.$transaction(updates);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error reordering questions:', err);
    return NextResponse.json({ error: 'Failed to reorder questions' }, { status: 500 });
  }
}