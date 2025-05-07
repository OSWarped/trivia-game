/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
// import { cookies }       from 'next/headers';
// import { getUserFromProvidedToken } from '@/utils/auth';

const prisma = new PrismaClient();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roundId: string }> }
) {
  const { roundId } = await params;

  if (!roundId) {
    return NextResponse.json({ error: 'roundId is required' }, { status: 400 });
  }

  try {
    const questions = await prisma.question.findMany({
      where: { roundId },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        text: true,
        type: true,
        sortOrder: true,
      },
    });

    return NextResponse.json( questions ); // ✅ Always return an object
  } catch (err) {
    console.error('[GET questions by roundId] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ roundId: string }> }
) {
  const { roundId } = await params;

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

  const count = await prisma.question.count({ where: { roundId: roundId } });
  const sortOrder = count + 1;

  // 1. Create the question
  const question = await prisma.question.create({
    data: {
      roundId,
      text,
      type,
      sortOrder,
    },
  });

  // 2. Add options (if provided)
  // Normalize options for SINGLE questions
let finalOptions: string[] = [];

if (type === 'SINGLE') {
  // For SINGLE, use correctAnswers as options if not explicitly passed
  finalOptions = options?.length ? options : correctAnswers ?? [];
} else {
  finalOptions = options ?? [];
}

// Create options if available
if (finalOptions.length > 0) {
  await prisma.option.createMany({
    data: finalOptions.map((optText: string, index: number) => ({
      questionId: question.id,
      text: optText,
      sortOrder: index + 1,
      isCorrect: Array.isArray(correctAnswers)
        ? correctAnswers.includes(optText)
        : false,
    })),
  });
}

  return NextResponse.json(question, { status: 201 });
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

  // 1. Update the question text and type
  const updatedQuestion = await prisma.question.update({
    where: { id: questionId },
    data: {
      text,
      type,
    },
  });

  // 2. Delete existing options (clean slate approach)
  await prisma.option.deleteMany({
    where: { questionId },
  });

  // 3. Recreate new options if provided
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

  return NextResponse.json(updatedQuestion);
}

