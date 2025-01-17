import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest, context: { params: Promise<{ teamId: string }> }) {
  try {
    const { teamId } = await context.params; // Await the params as a Promise
    const { requestId } = await req.json();

    // Fetch the join request
    const joinRequest = await prisma.teamJoinRequest.findUnique({ where: { id: requestId } });

    if (!joinRequest || joinRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Invalid join request' }, { status: 400 });
    }

    // Fetch the team to get the associated gameId
    const team = await prisma.team.findUnique({ where: { id: teamId } });

    if (!team ) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Create the transaction
    await prisma.$transaction([
      prisma.teamMembership.create({
        data: {
          userId: joinRequest.userId,
          teamId,
          status: 'ACTIVE',
        },
      }),
      prisma.teamJoinRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED', approvedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ message: 'Join request approved successfully' });
  } catch (error) {
    console.error('Error approving join request:', error);
    return NextResponse.json({ error: 'Failed to approve join request' }, { status: 500 });
  }
}
