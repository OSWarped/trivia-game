import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
 
// PUT: Toggle scores visibility
export async function PUT(req: Request, { params }: { params: Promise<{ gameId: string }> }) {
    const { gameId } = await params;
    const { scoresVisibleToPlayers } = await req.json();
  
    try {
      const updatedState = await prisma.gameState.update({
        where: { gameId },
        data: { scoresVisibleToPlayers },
      });
  
      return NextResponse.json(updatedState);
    } catch (error) {
      console.error('Error updating scores visibility:', error);
      return NextResponse.json({ error: 'Failed to update scores visibility' }, { status: 500 });
    }
  }
  