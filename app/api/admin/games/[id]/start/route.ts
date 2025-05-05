// app/api/admin/games/[gameId]/start/route.ts
import { NextResponse }            from 'next/server';
import { PrismaClient }            from '@prisma/client';
import { cookies }                 from 'next/headers';
import { getUserFromProvidedToken } from '@/utils/auth';

const prisma = new PrismaClient();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // authenticate
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = await getUserFromProvidedToken(token);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const started = await prisma.game.update({
      where: { id: id },
      data: {
        hostId:     user.userId,    // now fill in the starter
        status:     'LIVE',
        startedAt:  new Date(),
      },
    });
    return NextResponse.json(started);
  } catch (err) {
    console.error('Failed to start game:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
