import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

export async function POST(req: Request) {
  const { email, password } = await req.json();

  try {
    // Fetch user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Compare the provided password with the stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Roles are now stored directly in the User model
    const roles = user.roles || [];

    // Sign the JWT with the user roles and userId
    const token = jwt.sign({ userId: user.id, roles }, JWT_SECRET, {
      expiresIn: '2h',
    });

    // Set the cookie in the response
    const cookie = `token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`;
    const res = NextResponse.json({ token, roles }); // Return the token and roles in JSON response

    // Set the cookie header
    res.headers.set('Set-Cookie', cookie);

    return res;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
