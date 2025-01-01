import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { captainId } = await req.json();

    if (!captainId) {
      return NextResponse.json({ error: 'Captain ID is required' }, { status: 400 });
    }

    const team = await prisma.team.update({
      where: { id },
      data: { captainId },
    });

    return NextResponse.json(team, { status: 200 });
  } catch (error) {
    console.error('Error assigning team captain:', error);
    return NextResponse.json({ error: 'Failed to assign team captain' }, { status: 500 });
  }
}
