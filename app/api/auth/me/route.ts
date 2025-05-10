/* eslint-disable @typescript-eslint/no-unused-vars */
// app/api/auth/me/route.ts
import { NextResponse }    from 'next/server'
import { cookies }         from 'next/headers'
import jwt                 from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!

export async function GET() {
  // 1) await the cookie store
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  // 2) verify token
  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      userId: string
      email:  string
      role:   string
    }
    return NextResponse.json({ user: payload })
  } catch (err) {
    return NextResponse.json({ user: null }, { status: 401 })
  }
}
