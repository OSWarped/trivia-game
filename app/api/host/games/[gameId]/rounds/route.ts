import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;

  try {
    const rounds = await prisma.round.findMany({
      where: { gameId },
    });

    return NextResponse.json(rounds.length > 0 ? rounds : []);
  } catch (error) {
    console.error('Error fetching rounds:', error);
    return NextResponse.json({ error: 'Failed to fetch rounds' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const roundData = await req.json();

  try {
    const newRound = await prisma.round.create({
      data: {
        gameId: gameId,
        name: roundData.name,
        roundType: roundData.roundType,
        pointSystem: roundData.pointSystem,
        maxPoints: roundData.maxPoints, // Can be null
        timeLimit: roundData.timeLimit, // Can be null
        wagerLimit: roundData.wagerLimit, // Can be null
        pointPool: roundData.pointPool, // Array of integers
        pointValue: roundData.pointValue, // Can be null
        sortOrder: roundData.sortOrder, // Integer
      },
    });

    return NextResponse.json(newRound);
  } catch (error) {
    console.error('Error creating round:', error);
    return NextResponse.json({ error: 'Failed to create round' }, { status: 500 });
  }
}