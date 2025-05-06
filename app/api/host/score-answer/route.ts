import { PrismaClient } from '@prisma/client';
import { NextResponse, NextRequest } from 'next/server';
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

  /* ──────────────────────────────────────────────────────────────────
     1.  Fetch the answer + round info so we can decide points
  ────────────────────────────────────────────────────────────────── */
  const answer = await prisma.answer.findFirst({
    where: { questionId, teamGame: { teamId, gameId } },
    select: {
      teamGameId: true,
      awardedPoints: true,
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

  /* ──────────────────────────────────────────────────────────────────
     2.  Decide awardedPoints according to rules
         FLAT  → use round.pointValue if correct, else 0
         POOL  → use wager if correct, else 0
  ────────────────────────────────────────────────────────────────── */
  const newAwardedPoints =
    isCorrect
      ? pointSystem === 'FLAT'
        ? pointValue ?? 0
        : answer.awardedPoints            // POOL wager already stored
      : 0;

  /* 3. Update (teamId + gameId via relation) */
    await prisma.answer.updateMany({
        where: { questionId, teamGame: { teamId, gameId } },
        data:  {
        isCorrect,
        awardedPoints: newAwardedPoints,   // ← keep the points you decided
        },
    });

  /* ──────────────────────────────────────────────────────────────────
     4.  Recalculate the team’s total score
  ────────────────────────────────────────────────────────────────── */
  const aggregate = await prisma.answer.aggregate({
    where: { teamGame: { teamId, gameId }, isCorrect: true },
    _sum: { awardedPoints: true },
  });
  const newScore = aggregate._sum.awardedPoints ?? 0;

  /* ──────────────────────────────────────────────────────────────────
     5.  Emit score:update through a short‑lived socket
  ────────────────────────────────────────────────────────────────── */
  let ws: Socket | null = null;
  try {
    ws = ioClient(WS_URL, { transports: ['websocket'], forceNew: true });

    await new Promise<void>((resolve) => {
      ws!.on('connect', () => resolve());
      setTimeout(resolve, 1000); // fallback after 1 s
    });

    ws.emit('host:scoreUpdate', { gameId, teamId, newScore });
  } catch (err) {
    console.error('WS emit failed:', err);
  } finally {
    ws?.disconnect();
  }

  return NextResponse.json({ ok: true, newScore });
}
