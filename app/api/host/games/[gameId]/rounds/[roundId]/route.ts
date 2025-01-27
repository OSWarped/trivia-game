// app/api/host/games/[gameId]/rounds/[roundId]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PUT method to update the round
export async function PUT(req: Request, { params }: { params: Promise<{ gameId: string, roundId: string }> }) {
  const { roundId } = await params;
  const roundData = await req.json();
  
  console.log('Received round data for update:', roundData); // Debug log for incoming data

  // Validate the question point values for point-pool-based rounds (if applicable)
  if (roundData.pointSystem === 'POOL') {    
  }

  try {
    // Debug log before making the update
    console.log('Updating round with ID:', roundId);

    const updatedRound = await prisma.round.update({
      where: { id: roundId },
      data: {
        name: roundData.name,
        roundType: roundData.roundType,
        pointSystem: roundData.pointSystem,
        maxPoints: roundData.maxPoints,
        timeLimit: roundData.timeLimit,
        wagerLimit: roundData.wagerLimit,  
        sortOrder: roundData.sortOrder,      
      },
    });

    console.log('Round updated successfully:', updatedRound); // Log the updated round object
    return NextResponse.json(updatedRound);
  } catch (error) {
    console.error('Error updating round:', error);
    return NextResponse.json({ error: 'Failed to update round' }, { status: 500 });
  }
}

// DELETE method to delete the round
export async function DELETE(req: Request, { params }: { params: Promise<{ gameId: string, roundId: string }> }) {
  const { roundId } = await params;

  try {
    await prisma.round.delete({
      where: { id: roundId },
    });

    return NextResponse.json({ message: 'Round deleted successfully' });
  } catch (error) {
    console.error('Error deleting round:', error);
    return NextResponse.json({ error: 'Failed to delete round' }, { status: 500 });
  }
}

// GET method to fetch round data
export async function GET(req: Request, { params }: { params: Promise<{ gameId: string, roundId: string }> }) {
  const { roundId } = await params;

  try {
    const round = await prisma.round.findUnique({
      where: { id: roundId },
      include: {
        questions: {
          select: {
            id: true,
            text: true,
          },
        },  
      }   
    });

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    return NextResponse.json(round);
  } catch (error) {
    console.error('Error fetching round:', error);
    return NextResponse.json({ error: 'Failed to fetch round' }, { status: 500 });
  }
}
