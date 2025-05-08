/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/host/games/[gameId]/rounds/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies }       from 'next/headers';
import { getUserFromProvidedToken } from '@/utils/auth';

const prisma = new PrismaClient();

// GET: list all rounds for a given game
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  // auth
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await getUserFromProvidedToken(token);
  if (!user || (user.role !== 'HOST' && user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const rounds = await prisma.round.findMany({
      where: { gameId },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        roundType: true,
        pointSystem: true,
        pointValue: true,
        pointPool: true,
        timeLimit: true,
        wagerLimit: true,
        sortOrder: true,
      },
    });
    return NextResponse.json(rounds);
  } catch (err) {
    console.error('GET /api/host/games/[gameId]/rounds error:', err);
    return NextResponse.json({ error: 'Failed to load rounds' }, { status: 500 });
  }
}

// POST: create a new round for a game
export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  // auth
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await getUserFromProvidedToken(token);
  if (!user || (user.role !== 'HOST' && user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // parse body
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    name,
    roundType,
    pointSystem,
    pointValue,
    pointPool,
    timeLimit,
    wagerLimit,
  } = body;

  // basic validation
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  const validTypes = ['POINT_BASED','TIME_BASED','WAGER','LIGHTNING','IMAGE'];
  if (!validTypes.includes(roundType)) {
    return NextResponse.json({ error: 'Invalid roundType' }, { status: 400 });
  }

  // point-based additional validation
  if (roundType === 'POINT_BASED') {
    if (!pointSystem || !['FLAT','POOL'].includes(pointSystem)) {
      return NextResponse.json({ error: 'pointSystem must be FLAT or POOL' }, { status: 400 });
    }
    if (pointSystem === 'FLAT') {
      if (typeof pointValue !== 'number' || pointValue < 1) {
        return NextResponse.json({ error: 'pointValue must be ≥ 1' }, { status: 400 });
      }
    } else {
      if (!Array.isArray(pointPool) || pointPool.length === 0) {
        return NextResponse.json({ error: 'pointPool must be a non-empty array' }, { status: 400 });
      }
    }
  }

  // determine sortOrder
  const count = await prisma.round.count({ where: { gameId } });
  const sortOrder = count + 1;

  try {
    const newRound = await prisma.round.create({
      data: {
        gameId,
        name,
        roundType,
        pointSystem: roundType === 'POINT_BASED' ? pointSystem : 'FLAT',
        pointValue: roundType === 'POINT_BASED' && pointSystem === 'FLAT' ? pointValue : null,
        pointPool: roundType === 'POINT_BASED' && pointSystem === 'POOL' ? pointPool : [],
        timeLimit: roundType === 'TIME_BASED' ? timeLimit ?? null : null,
        wagerLimit: roundType === 'WAGER' ? wagerLimit ?? null : null,
        sortOrder,
      }
    });
    return NextResponse.json(newRound, { status: 201 });
  } catch (err) {
    console.error('POST /api/host/games/[gameId]/rounds error:', err);
    return NextResponse.json({ error: 'Failed to create round' }, { status: 500 });
  }
}
