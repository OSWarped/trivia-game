import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        captain: { select: { id: true, name: true } }, // ✅ Include Captain Information
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        TeamJoinRequest: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        teamGames: {
          include: {
            game: {
              select: {
                id: true,
                name: true,
                date: true,
              },
            },
          },
        },
        hostingSites: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Sort members alphabetically by name
    const sortedMembers = team.memberships
      .map((membership) => ({
        id: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)); // Alphabetical sorting

    const result = {
      id: team.id,
      name: team.name,
      captainId: team.captain?.id || null, // ✅ Add captainId
      games: team.teamGames,
      hostingSites: team.hostingSites,
      members: sortedMembers,
      joinRequests: team.TeamJoinRequest.map((request) => ({
        id: request.id,
        userId: request.user.id,
        userName: request.user.name,
        status: request.status,
      })),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching team details:", error);
    return NextResponse.json(
      { error: "Failed to fetch team details" },
      { status: 500 }
    );
  }
}
