import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, type JWTPayload } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';
const JWT_SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

interface DecodedToken extends JWTPayload {
  userId?: string;
  roles?: string[];
  role?: string;
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { valid: false, message: 'No token found' },
        { status: 401 }
      );
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
      const decoded = payload as DecodedToken;

      return NextResponse.json({
        valid: true,
        userId: decoded.userId ?? null,
        roles: decoded.roles ?? (decoded.role ? [decoded.role] : []),
      });
    } catch (error) {
      console.error('Caught error:', error);
      return NextResponse.json(
        { valid: false, message: 'Invalid token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error checking token expiry:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}