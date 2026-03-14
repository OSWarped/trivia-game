import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify, type JWTPayload } from 'jose';

interface DecodedToken extends JWTPayload {
  userId?: string;
  roles?: string[];
  role?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';
const JWT_SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

export async function GET() {
  try {
    // Retrieve the `token` cookie
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 401 });
    }

    // Decode and verify the token directly using jwt
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
          const decoded = payload as DecodedToken;

    if (!decoded) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Return the decoded payload
    return NextResponse.json({ userId: decoded.userId, roles: decoded.roles });
  } catch (error) {
    console.error('Error decoding token:', error);
    return NextResponse.json({ error: 'Failed to decode token' }, { status: 500 });
  }
}
