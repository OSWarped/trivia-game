import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

export async function GET(req: NextRequest) {
  try {
    // Extract token from the request cookies
    const token = req.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ valid: false, message: 'No token found' }, { status: 401 });
    }

    try {
      // Verify and decode the token
      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;

      // Check expiration
      const currentTime = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < currentTime) {
        return NextResponse.json({ valid: false, message: 'Token expired' }, { status: 401 });
      }

      return NextResponse.json({ valid: true, userId: decoded.userId, roles: decoded.roles });
    } catch (error) {
      console.error("Caught error: " + error);
      return NextResponse.json({ valid: false, message: 'Invalid token' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error checking token expiry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
