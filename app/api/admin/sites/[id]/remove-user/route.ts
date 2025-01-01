import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await req.json();

  try {
    const updatedSite = await prisma.hostingSite.update({
      where: { id },
      data: {
        siteRoles: {
          deleteMany: {
            userId,
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
    return NextResponse.json({ error: 'Failed to remove user' }, { status: 500 });
  }
}
