import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromToken } from "@/utils/auth";

const prisma = new PrismaClient();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { gameId } = await params;

    // Find the team the user is on for this game
    const userTeam = await prisma.teamGame.findFirst({
      where: {
        gameId,
        team: {
          memberships: {
            some: { userId: user.userId },
          },
        },
      },
      include: {
        team: true,
      },
    });

    if (!userTeam) {
      return NextResponse.json(
        { error: "Team not found for this game" },
        { status: 404 }
      );
    }

    // Get total points from both answers and subquestions
    const totalAnswerScore = await prisma.answer.aggregate({
      _sum: { pointsAwarded: true },
      where: { teamId: userTeam.team.id },
    });

    const totalSubAnswerScore = await prisma.subQuestionAnswer.aggregate({
      _sum: { pointsAwarded: true },
      where: { teamId: userTeam.team.id },
    });

    const totalScore =
      (totalAnswerScore._sum.pointsAwarded || 0) +
      (totalSubAnswerScore._sum.pointsAwarded || 0);

    return NextResponse.json({
      teamName: userTeam.team.name,
      teamScore: totalScore,
    });
  } catch (error) {
    console.error("Error fetching team score:", error);
    return NextResponse.json(
      { error: "Failed to fetch team score" },
      { status: 500 }
    );
  }
}
