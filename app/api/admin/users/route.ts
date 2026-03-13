import { NextResponse } from 'next/server';
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt'

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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name?: string;
      email?: string;
      role?: string;
      password?: string;
    };

    const name = body.name?.trim() ?? '';
    const email = body.email?.trim().toLowerCase() ?? '';
    const role = body.role?.trim().toUpperCase() ?? '';
    const password = body.password ?? '';

    if (!name || !email || !role || !password) {
      return NextResponse.json(
        { error: 'Name, email, role, and password are required.' },
        { status: 400 }
      );
    }

    const allowedRoles = Object.values(UserRole);

    if (!allowedRoles.includes(role as UserRole)) {
      return NextResponse.json(
        { error: 'Role must be ADMIN, HOST, or USER.' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with that email already exists.' },
        { status: 409 }
      );
    }

    const hashedPw = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        hashedPw,
        role: role as UserRole,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}