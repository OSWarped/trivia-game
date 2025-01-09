import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        game: true,
        memberships: {
          include: {
            user: true, // Fetch the user details through TeamMembership
          },
        },
        captain: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json(team, { status: 200 });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;
  const { userId } = await req.json();

  if (!teamId || !userId) {
    return NextResponse.json({ error: 'Team ID and User ID are required' }, { status: 400 });
  }

  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { game: true },
    });

    if (!team || !team.gameId) {
      return NextResponse.json({ error: 'Team or game not found' }, { status: 404 });
    }

    const gameId = team.gameId;

    const existingMembership = await prisma.teamMembership.findFirst({
      where: {
        userId,
        gameId,
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: 'User is already a member of another team in this game' },
        { status: 400 }
      );
    }

    await prisma.teamMembership.create({
      data: {
        userId,
        teamId,
        gameId,
      },
    });

    const updatedTeam = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        memberships: {
          include: {
            user: true,
          },
        },
      },
    });

    return NextResponse.json(updatedTeam, { status: 200 });
  } catch (error) {
    console.error('Error adding user to team:', error);
    return NextResponse.json({ error: 'Failed to add user to team' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;
  const { name, captainId, memberIds } = await req.json();

  try {
    // Fetch the team and its associated game
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { game: true, memberships: true },
    });

    if (!team || !team.gameId) {
      return NextResponse.json(
        { error: "Team or game not found" },
        { status: 404 }
      );
    }

    const gameId = team.gameId;

    // Check for conflicting memberships
    const errors: string[] = [];
    const validMembers: string[] = [];

    for (const userId of memberIds) {
      const existingMembership = await prisma.teamMembership.findFirst({
        where: { userId, gameId },
        include: { user: true }, // Include user details for name
      });

      if (existingMembership && existingMembership.teamId !== teamId) {
        errors.push(
          `User "${existingMembership.user.name}" is already a member of another team in this game.`
        );
      } else {
        validMembers.push(userId);
      }
    }

    // Remove memberships not in the new list
    const currentMemberIds = team.memberships.map((m) => m.userId);
    const membersToRemove = currentMemberIds.filter(
      (id) => !validMembers.includes(id)
    );

    if (membersToRemove.length > 0) {
      await prisma.teamMembership.deleteMany({
        where: {
          teamId,
          userId: { in: membersToRemove },
        },
      });
    }

    // Add valid new memberships
    const membersToAdd = validMembers.filter(
      (id) => !currentMemberIds.includes(id)
    );

    if (membersToAdd.length > 0) {
      const newMemberships = membersToAdd.map((userId) => ({
        userId,
        teamId,
        gameId,
      }));
      await prisma.teamMembership.createMany({ data: newMemberships });
    }

    // Update team name and captain
    await prisma.team.update({
      where: { id: teamId },
      data: {
        name,
        captainId,
      },
    });

    // Return the updated team with memberships
    const updatedTeam = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        memberships: {
          include: {
            user: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        team: updatedTeam,
        warnings: errors.length > 0 ? errors : null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating team:", error);
    return NextResponse.json({ error: "Failed to update team" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.team.delete({ where: { id } });
    return NextResponse.json({ message: 'Team deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 });
  }
}
