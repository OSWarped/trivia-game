import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { io as ioClient, Socket } from 'socket.io-client';

const prisma = new PrismaClient();
const WS_URL =
  process.env.NEXT_PUBLIC_WEBSOCKET_URL?.trim() || 'http://localhost:3009';

/**
 * POST /api/host/score-answer
 * body: { gameId, teamId, questionId, isCorrect }
 */
export async function POST(req: NextRequest) {
  const { gameId, teamId, questionId, isCorrect } = await req.json();

  if (!gameId || !teamId || !questionId || isCorrect === undefined) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  /* 1. fetch the single answer row + round config */
  const answer = await prisma.answer.findFirst({
    where: { questionId, teamGame: { teamId, gameId } },
    select: {
      id: true,
      pointsUsed: true,          // ← needed for POOL
      question: {
        select: {
          round: { select: { pointSystem: true, pointValue: true } },
        },
      },
    },
  });

  if (!answer) {
    return NextResponse.json({ error: 'Answer not found' }, { status: 404 });
  }

  const { pointSystem, pointValue } = answer.question.round;

  /* 2. decide awardedPoints */
  let awardedPoints = 0;
  if (isCorrect) {
    if (pointSystem === 'FLAT') {
      awardedPoints = pointValue ?? 0;
    } else if (pointSystem === 'POOL') {
      awardedPoints = answer.pointsUsed ?? 0;   // wagered chip
    }
  }

  /* 3. update that answer row */
  await prisma.answer.update({
    where: { id: answer.id },
    data:  { isCorrect, awardedPoints },
  });

  /* 4. recompute team’s total score */
  const agg = await prisma.answer.aggregate({
    where: { teamGame: { teamId, gameId }, isCorrect: true },
    _sum:  { awardedPoints: true },
  });
  const newScore = agg._sum.awardedPoints ?? 0;

   // persist into TeamGame.totalPts so your state endpoints will pick it up
   await prisma.teamGame.update({
    where: { teamId_gameId: { teamId, gameId } },
    data:  { totalPts: newScore },
  });

  /* 5. emit score:update via short‑lived socket */
  let ws: Socket | null = null;
  try {
    ws = ioClient(WS_URL, { transports: ['websocket'], forceNew: true });

    await new Promise<void>((resolve) => {
      ws!.on('connect', resolve);
      setTimeout(resolve, 1000);        // fallback after 1 s
    });

    ws.emit('score:update', { gameId, teamId, newScore });
  } catch (err) {
    console.error('WS emit failed:', err);
  } finally {
    ws?.disconnect();
  }

  return NextResponse.json({ ok: true, newScore });
}
