import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const gameId = req.nextUrl.searchParams.get("gameId");

    if (!gameId) {
      return NextResponse.json({ error: "Missing gameId parameter" }, { status: 400 });
    }

    // Fetch the team the user is on for this game
    const team = await prisma.team.findFirst({
      where: {
        teamGames: { some: { gameId } },
        memberships: { some: { userId } }, // Ensures the user is in the team
      },
      include: {
        captain: true, // Get the team captain details
      },
    });

    if (!team) {
      return NextResponse.json({ error: "User is not part of any team in this game" }, { status: 404 });
    }

    return NextResponse.json({ team });
  } catch (error) {
    console.error("Error fetching team for user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
