import { NextResponse } from 'next/server';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, role } = await req.json();

  try {
    const updatedSite = await prisma.hostingSite.update({
      where: { id },
      data: {
        siteRoles: {
          create: {
            userId,
            role: role as Role,
          },
        },
      },
      include: {
        siteRoles: {
          include: { user: true },
        },
      },
    });

    const siteWithUsers = {
      ...updatedSite,
      users: updatedSite.siteRoles.map((role) => ({
        id: role.user.id,
        email: role.user.email,
        role: role.role,
      })),
    };

    return NextResponse.json(siteWithUsers);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to assign user' }, { status: 500 });
  }
}
