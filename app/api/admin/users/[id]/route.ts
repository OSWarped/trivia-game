import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { name, email, roles } = await req.json();

    // Validate input
    if (!name || !email || !roles || !Array.isArray(roles)) {
      return NextResponse.json({ error: 'Invalid input data' }, { status: 400 });
    }

    // Ensure that only valid roles are included
    const validRoles = ['ADMIN', 'HOST', 'PLAYER', 'TEAM_CAPTAIN'];
    const filteredRoles = roles.filter((role: string) => validRoles.includes(role));

    // Update user details and roles
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        roles: {
          set: filteredRoles, // Set the roles array to the new list of valid roles
        },
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
