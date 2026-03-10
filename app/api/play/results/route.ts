import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type ResultsQuestionType =
  | 'SINGLE'
  | 'MULTIPLE_CHOICE'
  | 'ORDERED'
  | 'WAGER'
  | 'LIST';

function normalizeQuestionType(value: unknown): ResultsQuestionType {
  const normalized = String(value ?? '').toUpperCase();

  if (normalized === 'MULTIPLE_CHOICE') return 'MULTIPLE_CHOICE';
  if (normalized === 'ORDERED') return 'ORDERED';
  if (normalized === 'WAGER') return 'WAGER';
  if (normalized === 'LIST') return 'LIST';

  return 'SINGLE';
}

function buildCorrectAnswer(
  questionType: ResultsQuestionType,
  options: Array<{
    text: string;
    isCorrect: boolean;
    sortOrder: number | null;
  }>
): string {
  const sortedOptions = [...options].sort((a, b) => {
    const aOrder = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.sortOrder ?? Number.MAX_SAFE_INTEGER;

    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    return a.text.localeCompare(b.text);
  });

  const correctOptions = sortedOptions.filter((option) => option.isCorrect);

  if (questionType === 'ORDERED' || questionType === 'LIST') {
    return correctOptions.map((option) => option.text).join(' | ');
  }

  if (questionType === 'MULTIPLE_CHOICE' || questionType === 'SINGLE') {
    return correctOptions[0]?.text ?? '';
  }

  return correctOptions.map((option) => option.text).join(' | ');
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const gameId = searchParams.get('gameId');
  const teamId = searchParams.get('teamId');

  if (!gameId || !teamId) {
    return NextResponse.json(
      { error: 'Missing gameId or teamId' },
      { status: 400 }
    );
  }

  try {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        title: true,
        scheduledFor: true,
        status: true,
      },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const teamGame = await prisma.teamGame.findUnique({
      where: { teamId_gameId: { teamId, gameId } },
      select: {
        teamId: true,
        totalPts: true,
        team: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!teamGame) {
      return NextResponse.json(
        { error: 'Team not in game' },
        { status: 404 }
      );
    }

    const standings = await prisma.teamGame.findMany({
      where: { gameId },
      orderBy: { totalPts: 'desc' },
      select: {
        teamId: true,
        totalPts: true,
      },
    });

    const totalTeams = standings.length;
    const rank = standings.findIndex((row) => row.teamId === teamId) + 1;

    const answers = await prisma.answer.findMany({
      where: {
        teamGame: {
          teamId,
          gameId,
        },
      },
      select: {
        questionId: true,
        given: true,
        isCorrect: true,
        awardedPoints: true,
        favorite: true,
        items: {
          select: {
            id: true,
            submitted: true,
            isCorrect: true,
            awarded: true,
          },
          orderBy: {
            id: 'asc',
          },
        },
        question: {
          select: {
            text: true,
            sortOrder: true,
            type: true,
            round: {
              select: {
                sortOrder: true,
              },
            },
            options: {
              select: {
                text: true,
                isCorrect: true,
                sortOrder: true,
              },
              orderBy: [
                { sortOrder: 'asc' },
                { text: 'asc' },
              ],
            },
          },
        },
      },
    });

    const sortedAnswers = [...answers].sort((a, b) => {
      const roundA = a.question.round.sortOrder;
      const roundB = b.question.round.sortOrder;

      if (roundA !== roundB) {
        return roundA - roundB;
      }

      return a.question.sortOrder - b.question.sortOrder;
    });

    const answerResults = sortedAnswers.map((answer) => {
      const questionType = normalizeQuestionType(answer.question.type);
      const correctAnswer = buildCorrectAnswer(
        questionType,
        answer.question.options
      );
      const isListQuestion =
        questionType === 'ORDERED' || questionType === 'LIST';

      const correctOptions = answer.question.options.filter(
        (option) => option.isCorrect
      );

      const parts = isListQuestion
        ? answer.items.map((item, idx) => ({
            index: idx + 1,
            submitted: item.submitted,
            expected: correctOptions[idx]?.text ?? '',
            isCorrect: item.isCorrect ?? false,
          }))
        : undefined;

      return {
        questionId: answer.questionId,
        roundNumber: answer.question.round.sortOrder,
        questionNumber: answer.question.sortOrder,
        text: answer.question.text,
        yourAnswer: answer.given ?? '',
        correctAnswer,
        questionType,
        isCorrect: answer.isCorrect ?? false,
        pointsDelta: answer.awardedPoints ?? 0,
        favorite: answer.favorite ?? false,
        parts,
      };
    });

    const totalCorrect = sortedAnswers.filter((a) => a.isCorrect).length;
    const deltas = sortedAnswers.map((a) => a.awardedPoints ?? 0);
    const sum = deltas.reduce((acc, value) => acc + value, 0);
    const avgPoints = sortedAnswers.length ? sum / sortedAnswers.length : 0;
    const maxGain = deltas.length ? Math.max(...deltas) : 0;
    const maxLoss = deltas.length ? Math.min(...deltas) : 0;
    const favoritesCount = sortedAnswers.filter((a) => a.favorite).length;

    return NextResponse.json({
      game: {
        id: game.id,
        title: game.title,
        date: game.scheduledFor?.toISOString() ?? '',
        status: game.status,
        rank,
        totalTeams,
      },
      team: {
        id: teamId,
        name: teamGame.team?.name ?? teamId,
        finalScore: teamGame.totalPts,
        rank,
      },
      answers: answerResults,
      stats: {
        totalCorrect,
        avgPoints,
        maxGain,
        maxLoss,
        favoritesCount,
      },
    });
  } catch (err) {
    console.error('Error in results API:', err);
    return NextResponse.json(
      { error: 'Failed to load results' },
      { status: 500 }
    );
  }
}