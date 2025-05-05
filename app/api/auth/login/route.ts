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
    const isPasswordValid = await bcrypt.compare(password, user.hashedPw);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Clear any existing cookie
    const clearCookie = `token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
    const clearRes = NextResponse.json({ success: true });

    // Set the clear cookie header
    clearRes.headers.set('Set-Cookie', clearCookie);

    // Roles are now stored directly in the User model
    const role = user.role || '';

    // Sign the JWT with the user roles and userId
    const token = jwt.sign(
      { userId: user.id, email: user.email, role },   // ← include email
      JWT_SECRET,
      { expiresIn: '4h' }
    );

    // Set the cookie in the response
    const dev = process.env.NODE_ENV !== 'production';
    //const cookie = `token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`;
    const cookie = [
      `token=${token}`,
      'HttpOnly',
      'SameSite=Strict',
      'Path=/',
      `Max-Age=${60 * 60 * 4}`,            // 4 h
      !dev && 'Secure',                    // send Secure only in prod
    ]
      .filter(Boolean)
      .join('; ');
    
    const res = NextResponse.json({ token, role }); // Return the token and roles in JSON response

    // Set the cookie header
    res.headers.set('Set-Cookie', cookie);

    return res;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
