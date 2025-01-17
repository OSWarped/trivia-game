import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    console.log(req);
    const games = await prisma.game.findMany({
      include: {
        teamGames: {
          include: {
            team: true, // Include details of the associated teams
          },
        },
        hostingSite: true, // Include hosting site details
      },
    });

    // If no games found, return an empty array
    return NextResponse.json(games || []);
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  console.log(req);
  const { name, date, hostingSiteId, hostId } = await req.json();

  // Validation
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
  }
  if (!date || isNaN(Date.parse(date))) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }
  if (!hostingSiteId || typeof hostingSiteId !== 'string') {
    return NextResponse.json({ error: 'Invalid hostingSiteId' }, { status: 400 });
  }
  if (!hostId || typeof hostId !== 'string') {
    return NextResponse.json({ error: 'Invalid hostId' }, { status: 400 });
  }

  try {
    // Create a new game with the given data
    const newGame = await prisma.game.create({
      data: {
        name,
        date: new Date(date), // Ensure the date is properly formatted
        hostingSiteId,
        hostId, // Directly assign the hostId to the game
      },
    });

    return NextResponse.json(newGame);
  } catch (error) {
    console.log("FOUND ERROR");
    if (error instanceof Error) {
      console.log("Error: ", error.stack);
    }
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
  }
}