// app/api/admin/sites/[siteId]/events/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  req: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  // await the entire context, then grab params.siteId
  const { siteId } = await params;
  
  console.log('→ loading events for siteId=', siteId)

  if (!siteId) {
    return NextResponse.json({ error: 'Missing siteId' }, { status: 400 })
  }

  try {
    const events = await prisma.event.findMany({
      where:   { siteId },
      include: { schedules: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(events)
  } catch (err) {
    console.error('Error fetching events for', siteId, err)
    return NextResponse.json({ error: 'Failed to load events' }, { status: 500 })
  }
}
