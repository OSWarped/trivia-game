import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const { questionId } = await params;

  if (!questionId) {
    return NextResponse.json({ error: 'Question ID is required' }, { status: 400 });
  }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      options: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!question) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: question.id,
    text: question.text,
    type: question.type,
    options: question.options.map((opt) => opt.text),
    correctAnswers: question.options.filter((opt) => opt.isCorrect).map((opt) => opt.text),
  });
}

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ questionId: string }> }
  ) {
    const { questionId } = await params;
  
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
  
    const { text, type, options, correctAnswers } = body;
  
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
  
    const validTypes = ['SINGLE', 'MULTIPLE_CHOICE', 'ORDERED', 'WAGER', 'LIST'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  
    // 1. Update the question
    await prisma.question.update({
      where: { id: questionId },
      data: {
        text,
        type,
      },
    });
  
    // 2. Remove old options
    await prisma.option.deleteMany({
      where: { questionId },
    });
  
    // 3. Create new options
    if (Array.isArray(options) && options.length > 0) {
      await prisma.option.createMany({
        data: options.map((opt: string, index: number) => ({
          questionId,
          text: opt,
          sortOrder: index + 1,
          isCorrect: Array.isArray(correctAnswers)
            ? correctAnswers.includes(opt)
            : false,
        })),
      });
    }
  
    // 4. Re-fetch updated question with options
    const fullUpdated = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        options: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  
    if (!fullUpdated) {
      return NextResponse.json({ error: 'Failed to reload updated question' }, { status: 500 });
    }
  
    // 5. Return full structure
    return NextResponse.json({
      id: fullUpdated.id,
      text: fullUpdated.text,
      type: fullUpdated.type,
      options: fullUpdated.options.map((opt) => opt.text),
      correctAnswers: fullUpdated.options
        .filter((opt) => opt.isCorrect)
        .map((opt) => opt.text),
    });
  }