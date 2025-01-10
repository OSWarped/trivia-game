import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
    req: Request,
    { params }: { params: Promise<{ gameId: string; questionId: string; teamId: string }> }
  ) {
    const { questionId, teamId } = await params;
  
    try {
      const answer = await prisma.answer.findFirst({
        where: { questionId, teamId },
      });
  
      if (!answer) {
        return NextResponse.json({ error: 'No answer found' }, { status: 404 });
      }
  
      return NextResponse.json({ answer: answer.answer });
    } catch (error) {
      console.error('Error fetching answer:', error);
      return NextResponse.json({ error: 'Failed to fetch answer' }, { status: 500 });
    }
  }
  