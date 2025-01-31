import { NextResponse } from 'next/server';
import { getUserFromProvidedToken } from '@/utils/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const token = (await cookies()).get('token')?.value; // ✅ Retrieve token correctly

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromProvidedToken(token); // ✅ Get user data

    return NextResponse.json({
      userId: user?.userId,
      email: user?.email,
      roles: Array.isArray(user?.roles) && user.roles.length > 0 ? user.roles : ['PLAYER'], // ✅ Ensure 'roles' is an array & always includes a default role
    });

  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json({ error: 'Failed to authenticate' }, { status: 500 });
  }
}
