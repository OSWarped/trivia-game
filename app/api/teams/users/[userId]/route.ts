import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  // Parse the `gameId` query parameter
  const url = new URL(req.url);
  const gameId = url.searchParams.get("gameId");

  if (!gameId) {
    return NextResponse.json(
      { error: "Missing gameId query parameter" },
      { status: 400 }
    );
  }

  try {
    // Find the team for the user in the specified game
    const membership = await prisma.teamMembership.findFirst({
      where: {
        userId,
        gameId,
      },
      include: {
        team: true, // Include team details
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "No team found for the user in the specified game" },
        { status: 404 }
      );
    }

    return NextResponse.json(membership.team, { status: 200 });
  } catch (error) {
    console.error("Error fetching team for user:", error);
    return NextResponse.json(
      { error: "Failed to fetch team for user" },
      { status: 500 }
    );
  }
}
