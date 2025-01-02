import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    console.log(req);
    const games = await prisma.game.findMany({
      include: {
        teams: true,  // Include associated teams for each game
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
    console.log("trying to add Game");
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
  } catch(error) {
    console.log("FOUND ERROR");
    if (error instanceof Error){
        console.log("Error: ", error.stack)
    }
}
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // Get the game ID from the URL parameters
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
    // Update the game details with the new values
    const updatedGame = await prisma.game.update({
      where: { id },
      data: {
        name,
        date: new Date(date),
        hostingSiteId,
        hostId, // Update the hostId if provided
      },
    });

    return NextResponse.json(updatedGame);
  } catch(error) {
    if (error instanceof Error){
        console.log("Error: ", error.stack)
    }
}
}
