// File: /app/api/host/score-list-answer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { io as ioClient, Socket } from "socket.io-client";

const prisma = new PrismaClient();
const WS_URL =
  process.env.NEXT_PUBLIC_WEBSOCKET_URL?.trim() ||
  "http://localhost:3009";

export async function POST(req: NextRequest) {
  const { gameId, teamId, questionId, itemIndex, isCorrect } =
    await req.json();

  // 1) validation
  if (
    !gameId ||
    !teamId ||
    !questionId ||
    typeof itemIndex !== "number" ||
    typeof isCorrect !== "boolean"
  ) {
    return NextResponse.json(
      { error: "Missing or invalid fields" },
      { status: 400 }
    );
  }

  // 2) find teamGame
  const teamGame = await prisma.teamGame.findUnique({
    where: { teamId_gameId: { teamId, gameId } },
    select: { id: true },
  });
  if (!teamGame) {
    return NextResponse.json(
      { error: "Team not in game" },
      { status: 404 }
    );
  }

  // 3) load the Answer + its items + round.pointValue
  const answer = await prisma.answer.findFirst({
    where: {
      teamGameId: teamGame.id,
      questionId,
    },
    include: {
      items: { orderBy: { id: "asc" } },
      question: {
        select: {
          round: {
            select: { pointValue: true },
          },
        },
      },
    },
  });
  if (!answer) {
    return NextResponse.json(
      { error: "Answer not found" },
      { status: 404 }
    );
  }

  // 4) guard itemIndex
  if (itemIndex < 0 || itemIndex >= answer.items.length) {
    return NextResponse.json(
      { error: "Invalid itemIndex" },
      { status: 400 }
    );
  }

  // 5) update that AnswerItem
  const itemId = answer.items[itemIndex].id;
  await prisma.answerItem.update({
    where: { id: itemId },
    data: { isCorrect },
  });

  // 6) recompute how many are correct
  const correctCount = await prisma.answerItem.count({
    where: {
      answerId: answer.id,
      isCorrect: true,
    },
  });
  const perItemValue = answer.question.round.pointValue ?? 0;
  const newAwardedPoints = correctCount * perItemValue;

  // 7) update the parent answer’s awardedPoints
  await prisma.answer.update({
    where: { id: answer.id },
    data: { awardedPoints: newAwardedPoints },
  });

  // 8) re-aggregate the team’s total score (sum of all awardedPoints)
  const agg = await prisma.answer.aggregate({
    where: { teamGameId: teamGame.id },
    _sum: { awardedPoints: true },
  });
  const newScore = agg._sum.awardedPoints ?? 0;

  // 9) emit via socket
  let ws: Socket | null = null;
  try {
    ws = ioClient(WS_URL, { transports: ["websocket"], forceNew: true });
    await new Promise<void>((resolve) => {
      ws!.on("connect", resolve);
      setTimeout(resolve, 1000);
    });
    ws.emit("score:update", { gameId, teamId, newScore });
  } catch (e) {
    console.error("WS emit failed:", e);
  } finally {
    ws?.disconnect();
  }

  return NextResponse.json({ ok: true, newScore });
}
