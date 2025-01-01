import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;
  
    try {
      const { name, email } = await req.json();
  
      // Validate input
      if (!name || !email) {
        return NextResponse.json({ error: 'Invalid input data' }, { status: 400 });
      }
  
      // Update user details
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { name, email },
      });
  
      return NextResponse.json(updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
  }
  