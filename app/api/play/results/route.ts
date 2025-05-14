import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const gameId = searchParams.get('gameId');
  const teamId = searchParams.get('teamId');

  if (!gameId || !teamId) {
    return NextResponse.json({ error: 'Missing gameId or teamId' }, { status: 400 });
  }

  try {
    // 1. Fetch game info
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { id: true, title: true, scheduledFor: true, status: true }
    });
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // 2. Fetch team info & rank
    const teamGame = await prisma.teamGame.findUnique({
      where: { teamId_gameId: { teamId, gameId } },
      select: { teamId: true, totalPts: true }
    });
    if (!teamGame) {
      return NextResponse.json({ error: 'Team not in game' }, { status: 404 });
    }

    // Compute overall ranks
    const standings = await prisma.teamGame.findMany({
      where: { gameId },
      orderBy: { totalPts: 'desc' },
      select: { teamId: true, totalPts: true }
    });
    const totalTeams = standings.length;
    const rank = standings.findIndex(r => r.teamId === teamId) + 1;

    // 3. Fetch answers with question metadata
    const answers = await prisma.answer.findMany({
      where: { teamGame: { teamId, gameId } },
      orderBy: { question: { id: 'asc' } },
      select: {
        questionId: true,
        question: { select: { text: true } },
        given: true,
        isCorrect: true,
        awardedPoints: true,
        favorite: true,
      }
    });

    // 4. Build answer results
    const answerResults = answers.map(a => ({
      questionId: a.questionId,
      text: a.question.text,  // the prompt text
      yourAnswer: a.given,     // the team's submitted answer
      isCorrect: a.isCorrect,
      pointsDelta: a.awardedPoints,
      favorite: a.favorite
    }));

    // 5. Compute stats
    const totalCorrect = answers.filter(a => a.isCorrect).length;
    const deltas = answers.map(a => a.awardedPoints);
    const sum = deltas.reduce((acc, x) => acc + x, 0);
    const avgPoints = answers.length ? sum / answers.length : 0;
    const maxGain = deltas.length ? Math.max(...deltas) : 0;
    const maxLoss = deltas.length ? Math.min(...deltas) : 0;
    const favoritesCount = answers.filter(a => a.favorite).length;

    // 6. Assemble response
    const resultsData = {
      game: {
        id: game.id,
        title: game.title,
        date: game.scheduledFor?.toISOString(),
        status: game.status,
        rank,
        totalTeams
      },
      team: {
        id: teamId,
        name: teamGame.teamId,
        finalScore: teamGame.totalPts,
        rank
      },
      answers: answerResults,
      stats: {
        totalCorrect,
        avgPoints,
        maxGain,
        maxLoss,
        favoritesCount
      }
    };

    return NextResponse.json(resultsData);
  } catch (err) {
    console.error('Error in results API:', err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}