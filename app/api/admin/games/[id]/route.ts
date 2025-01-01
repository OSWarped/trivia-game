import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        hostingSite: true, // Include hosting site details
        teams: true,       // Include associated teams
        rounds: {
          include: {
            questions: true, // Include associated questions
          },
        },
      },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json(game);
  } catch (error) {
    console.error('Error fetching game:', error);
    return NextResponse.json({ error: 'Failed to fetch game' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { name, date, hostingSiteId } = await req.json();

    if (!name || !date || !hostingSiteId) {
      return NextResponse.json(
        { error: 'Name, date, and hosting site are required' },
        { status: 400 }
      );
    }

    const updatedGame = await prisma.game.update({
      where: { id },
      data: {
        name,
        date: new Date(date),
        hostingSite: {
          connect: { id: hostingSiteId },
        },
      },
    });

    return NextResponse.json(updatedGame);
  } catch (error) {
    console.error('Error updating game:', error);
    return NextResponse.json({ error: 'Failed to update game' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const deletedGame = await prisma.game.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Game deleted successfully', deletedGame });
  } catch (error) {
    console.error('Error deleting game:', error);
    return NextResponse.json({ error: 'Failed to delete game' }, { status: 500 });
  }
}
