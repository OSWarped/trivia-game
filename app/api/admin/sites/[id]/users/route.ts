import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET function to fetch users for a specific site
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const users = await prisma.siteRole.findMany({
      where: { siteId: id },
      include: { user: true },
    });

    const formattedUsers = users.map((userRole) => ({
      id: userRole.user.id,
      email: userRole.user.email,
      role: userRole.role,
    }));

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users for site:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST function to add a user to a site
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId, role } = await req.json();

  if (!userId || !role) {
    return NextResponse.json({ error: 'Invalid input data' }, { status: 400 });
  }

  try {
    const newRole = await prisma.siteRole.create({
      data: {
        user: { connect: { id: userId } },
        hostingSite: { connect: { id } },
        role,
      },
    });

    return NextResponse.json(newRole);
  } catch (error) {
    console.error('Error adding user to site:', error);
    return NextResponse.json({ error: 'Failed to add user' }, { status: 500 });
  }
}
