import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromToken } from '@/utils/auth'; // Import your utility function
const prisma = new PrismaClient();
// GET: Fetch all pending requests for the logged-in user
// GET: Fetch all pending requests for the logged-in user
export async function GET() {
    try {
      // Get the authenticated user from the token
      const user = await getUserFromToken();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
  
      // Fetch pending join requests for the user
      const pendingRequests = await prisma.teamJoinRequest.findMany({
        where: {
          userId: user.userId,
          status: 'PENDING',
        },
        include: {
          team: {
            include: {
              captain: true, // Include captain info for the team
              teamGames: {
                include: {
                  game: {
                    include: {
                      hostingSite: true, // Include hosting site info for the game
                    },
                  },
                },
              },
            },
          },
        },
      });
  
      // Transform the data to include only the necessary fields
      const formattedRequests = pendingRequests.map((request) => ({
        id: request.id,
        status: request.status,
        requestedAt: request.requestedAt,
        team: {
          id: request.team.id,
          name: request.team.name,
          captainName: request.team.captain?.name || 'Unknown',
          games: request.team.teamGames.map((teamGame) => ({
            id: teamGame.game.id,
            name: teamGame.game.name,
            date: teamGame.game.date,
            hostingSite: {
              id: teamGame.game.hostingSite.id,
              name: teamGame.game.hostingSite.name,
              location: teamGame.game.hostingSite.location,
            },
          })),
        },
      }));
  
      return NextResponse.json(formattedRequests);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      return NextResponse.json({ error: 'Failed to fetch pending requests' }, { status: 500 });
    }
  }
  
  // DELETE: Cancel a pending request
  export async function DELETE(req: Request) {
    try {
      // Get the authenticated user from the token
      const user = await getUserFromToken();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
  
      // Parse the request body to get the request ID
      const { id: requestId } = await req.json();
  
      // Validate that the request exists and belongs to the user
      const request = await prisma.teamJoinRequest.findUnique({
        where: { id: requestId },
        include: { user: true },
      });
  
      if (!request || request.userId !== user.userId) {
        return NextResponse.json({ error: 'Request not found or unauthorized' }, { status: 404 });
      }
  
      // Delete the request
      await prisma.teamJoinRequest.delete({
        where: { id: requestId },
      });
  
      return NextResponse.json({ message: 'Request canceled successfully' });
    } catch (error) {
      console.error('Error canceling request:', error);
      return NextResponse.json({ error: 'Failed to cancel request' }, { status: 500 });
    }
  }