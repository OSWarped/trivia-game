import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;

  try {
    const rounds = await prisma.round.findMany({
      where: { gameId },
      include: {
        questions: {
          select: {
            id: true,
            text: true,
          },
          orderBy: {
            sortOrder: 'asc', // Ensure the next round is the smallest greater sortOrder
          },
        },
      },
      orderBy: {
        sortOrder: 'asc', // Ensure the next round is the smallest greater sortOrder
      },
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
        maxPoints: roundData.maxPoints || null, // Allow null
        timeLimit: roundData.timeLimit || null, // Allow null
        wagerLimit: roundData.wagerLimit || null, // Allow null
        pointPool: roundData.pointPool || [], // Default to an empty array
        pointValue: roundData.pointValue || null, // Allow null
        sortOrder: Number(roundData.sortOrder) || 1, // Default to 1 if invalid
      },
    });

    return NextResponse.json(newRound);
  } catch (error) {
    console.error('Error creating round:', error);
    return NextResponse.json({ error: 'Failed to create round' }, { status: 500 });
  }
}