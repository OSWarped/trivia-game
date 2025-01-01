import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';  // Remove Game import

const prisma = new PrismaClient();

export async function GET() {
  try {
    const games = await prisma.game.findMany({
      select: {
        id: true,
        name: true,
        date: true,
        hostingSiteId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      games.map((game) => ({
        ...game,
        date: new Date(game.date).toLocaleString('en-US', { timeZone: 'America/Chicago' }),
      }))
    );
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  }
}


export async function POST(req: Request) {
  try {
    const { name, date, hostingSiteId } = await req.json();

    if (!name || !date || !hostingSiteId) {
      return NextResponse.json(
        { error: 'Name, date, and hosting site are required' },
        { status: 400 }
      );
    }

    const newGame = await prisma.game.create({
      data: {
        name,
        date: new Date(date),
        hostingSite: {
          connect: { id: hostingSiteId },
        },
      },
    });

    return NextResponse.json(newGame, { status: 201 });
  } catch (error) {
    console.error('Error creating game:', error);
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
  }
}
