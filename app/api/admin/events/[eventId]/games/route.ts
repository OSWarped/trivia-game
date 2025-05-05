import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromProvidedToken } from '@/utils/auth'; // your JWT util
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  try {
    const games = await prisma.game.findMany({
      where: { eventId },
      orderBy: { scheduledFor: 'asc' },
    });
    return NextResponse.json(games);
  } catch (err) {
    console.error('GET /admin/events/[eventId]/games error:', err);
    return NextResponse.json({ error: 'Failed to load games' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { title, seasonId, scheduledFor } = body;
  if (!title || typeof title !== 'string') {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  // generate unique join code
  let joinCode = '';
  let isUnique = false;

  while (!isUnique) {
    joinCode = generateJoinCode();
    const existing = await prisma.game.findUnique({ where: { joinCode } });
    if (!existing) isUnique = true;
  }

  try {
    console.log(`Creating game "${title}" with joinCode ${joinCode}`);

    const game = await prisma.game.create({
      data: {
        eventId,
        seasonId: seasonId || undefined,
        title,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : new Date(),
        status: 'DRAFT',
        joinCode,
      },
    });

    return NextResponse.json(game, { status: 201 });
  } catch (err) {
    console.error('Failed to create game:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

  function generateJoinCode(length = 6): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // avoids confusing characters
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
  