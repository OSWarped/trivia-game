import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Explicitly type the users array
    const users: Array<{ id: string; email: string; name: string; role: string }> = await prisma.user.findMany();

    // Format the response to include roles directly from the 'roles' field
    const formattedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || '', // Fetch roles directly from the 'roles' array
    }));

    return NextResponse.json(formattedUsers);
  } catch (error) {
    // Safeguard against null or undefined errors
    console.error('Error fetching users:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
