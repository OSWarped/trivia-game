import { NextResponse } from 'next/server';
import { getUserFromToken } from '@/utils/auth'; // Import the new utility function




export async function GET() {  
  const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } 

