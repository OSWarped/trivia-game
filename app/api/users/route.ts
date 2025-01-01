import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/utils/verifyToken';
import { authorize } from '@/utils/authorize';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');

  if (!authHeader) {
    return NextResponse.json({ error: 'No token provided' }, { status: 401 });
  }

  const decoded = verifyToken(authHeader);

  if (!decoded) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    // Fetch the user from the database, including roles
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { siteRoles: true }, // Adjust based on your schema
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Extract roles from the user's siteRoles relation
    const userRoles = user.siteRoles.map((role) => role.role);

    if (!authorize(userRoles, 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch and return all users (for example)
    const users = await prisma.user.findMany();
    return NextResponse.json(users);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
