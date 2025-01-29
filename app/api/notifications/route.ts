import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromToken } from '@/utils/auth'; // Import the new utility function

const prisma = new PrismaClient();

export async function GET() {
    const user = await getUserFromToken();
  
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId: user.userId, isRead: false },
        orderBy: { createdAt: 'desc' },
      });
  
      return NextResponse.json({ notifications });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }
  }
  

// POST: Create a new notification
export async function POST(req: Request) {
    const { userId, message, link } = await req.json();
  
    try {
      const newNotification = await prisma.notification.create({
        data: {
          userId,
          message,
          link,
        },
      });
  
      return NextResponse.json({ notification: newNotification });
    } catch (error) {
      console.error('Error creating notification:', error);
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
    }
  }
  