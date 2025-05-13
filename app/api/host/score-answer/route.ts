import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
//import { io as ioClient, Socket } from 'socket.io-client';
  // 5️⃣ emit via your long-running Socket.IO server
  import { getIo } from '@/lib/socket';  // wherever you exposed the io instance


const prisma = new PrismaClient();
const WS_URL =
  process.env.NEXT_PUBLIC_WEBSOCKET_URL?.trim();

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
      pointsUsed: true,
      question: {
        select: {
          round: {
            select: {
              roundType: true,      // e.g. 'STANDARD' or 'WAGER'
              pointSystem: true,    // 'FLAT' vs. 'POOL'
              pointValue:  true,    // flat‐point amount, if FLAT
            }
          },
        },
      },
    },
  });

  if (!answer) {
    return NextResponse.json({ error: 'Answer not found' }, { status: 404 });
  }

  const { roundType, pointSystem, pointValue } = answer.question.round;

  /* 2. decide awardedPoints */
  let awardedPoints = 0;

  if (roundType === 'WAGER') {
    // win: +stake; lose: –stake
    const stake = answer.pointsUsed ?? 0;
    awardedPoints = isCorrect ? stake : -stake;

    console.log('Team wagered: ' + stake + '\nResult is ' + awardedPoints);
  
  } else if (isCorrect) {
    // non-wager logic unchanged
    if (pointSystem === 'FLAT') {
      awardedPoints = pointValue ?? 0;
    } else if (pointSystem === 'POOL') {
      awardedPoints = answer.pointsUsed ?? 0;
    }
  }

  /* 3. update that answer row */
  await prisma.answer.update({
    where: { id: answer.id },
    data:  { isCorrect, awardedPoints },
  });

  /* 4. recompute team’s total score */
  const agg = await prisma.answer.aggregate({
    where: { teamGame: { teamId, gameId }},
    _sum:  { awardedPoints: true },
  });
  const newScore = agg._sum.awardedPoints ?? 0;
  // Persist into the TeamGame row…
  await prisma.teamGame.update({
    where: { teamId_gameId: { teamId, gameId } },
    data:  { totalPts: newScore },
  });


try {
  const io = getIo();
  io.to(gameId).emit('score:update', { teamId, newScore });
} catch (err) {
  console.error('Emit on server socket failed:', err);
}

return NextResponse.json({ ok: true, newScore });
}
