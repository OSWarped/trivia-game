import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const { gameId } = await params;

    // Fetch all captains currently in the lobby
    const captainsInLobby = await prisma.lobbySession.findMany({
      where: { gameId },
      select: { captainId: true },
    });

    const captainIds = captainsInLobby.map((session) => session.captainId);

    // Fetch all teams where the captain is in the lobby
    const teamsInLobby = await prisma.team.findMany({
      where: { captainId: { in: captainIds } },
      include: { captain: true },
    });

    return NextResponse.json({ teams: teamsInLobby });
  } catch (error) {
    console.error("Error fetching teams in lobby:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
