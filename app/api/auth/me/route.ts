import { NextResponse } from 'next/server';
import { getUserFromProvidedToken } from '@/utils/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {

    console.log('[auth/me] route hit');
    // cookies() is synchronous
    const token = (await cookies()).get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromProvidedToken(token);

    return NextResponse.json({
      userId: user?.userId,
      email: user?.email,
      role: user?.role ?? 'HOST',   // adjust default as you wish
    });
  } catch (err) {
    console.error('Error in /api/auth/me:', err);
    return NextResponse.json({ error: 'Failed to authenticate' }, { status: 500 });
  }
}