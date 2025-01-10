import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params; // Await the params as per Next.js 15+ requirements
  const body = await req.json();
  const { userId, gameId } = body; // Extract userId and gameId from the request body

  if (!userId || !gameId) {
    return NextResponse.json(
      { error: 'Missing userId or gameId' },
      { status: 400 }
    );
  }

  try {
    // Check if the user is already part of the team for the given game
    const existingMembership = await prisma.teamMembership.findFirst({
      where: {
        teamId,
        userId,
        gameId,
      },
    });

    if (existingMembership) {
      return NextResponse.json({
        message: 'User is already a member of this team for the specified game',
      });
    }

    // Create a new team membership
    const newMembership = await prisma.teamMembership.create({
      data: {
        teamId,
        userId,
        gameId,
      },
    });

    return NextResponse.json({
      message: 'Joined team successfully',
      membership: newMembership,
    });
  } catch (error) {
    console.error('Error joining team:', error);
    return NextResponse.json(
      { error: 'Failed to join team' },
      { status: 500 }
    );
  }
}
