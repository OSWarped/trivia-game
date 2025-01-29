import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.headers.set(
    'Set-Cookie',
    'token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
  );

  return response;
}
