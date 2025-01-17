import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  try {
    const { requestId } = await req.json();
    const teamId = await params;
    console.log("TeamID found: " + teamId);
    
    const joinRequest = await prisma.teamJoinRequest.findUnique({ where: { id: requestId } });

    if (!joinRequest || joinRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Invalid join request' }, { status: 400 });
    }

    await prisma.teamJoinRequest.update({
      where: { id: requestId },
      data: { status: 'DECLINED', approvedAt: new Date() },
    });

    return NextResponse.json({ message: 'Join request denied successfully' });
  } catch (error) {
    console.error('Error denying join request:', error);
    return NextResponse.json({ error: 'Failed to deny join request' }, { status: 500 });
  }
}
