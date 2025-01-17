import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest, context: { params: Promise<{ teamId: string }> }) {
  try {
    const { teamId } = await context.params; // Unwrap params
    const { userId } = await req.json();

    if (!teamId || !userId) {
      return NextResponse.json({ error: 'Team ID and User ID are required' }, { status: 400 });
    }

    // Check if the team exists
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Remove the team membership
    await prisma.teamMembership.deleteMany({
      where: {
        teamId,
        userId,
      },
    });

    return NextResponse.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 });
  }
}
