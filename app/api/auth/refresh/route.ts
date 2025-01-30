import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

export async function GET(req: NextRequest) {
  try {
    // Extract token from cookies
    const token = req.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ success: false, message: 'No token found' }, { status: 401 });
    }

    try {
      // Decode the token without verifying the expiration (to get userId)
      const decoded = jwt.decode(token) as jwt.JwtPayload;

      if (!decoded || !decoded.userId) {
        return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
      }

      // Fetch user from DB
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        return NextResponse.json({ success: false, message: 'User not found' }, { status: 401 });
      }

      // Generate a new token
      const newToken = jwt.sign({ userId: user.id, roles: user.roles }, JWT_SECRET, {
        expiresIn: '4h',
      });

      // Set the new token as an HTTP-only cookie
      const cookie = `token=${newToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=14400`;
      const res = NextResponse.json({ success: true, token: newToken });

      res.headers.set('Set-Cookie', cookie);
      return res;
    } catch (error) {
      console.error("Caught error: " + error);
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
