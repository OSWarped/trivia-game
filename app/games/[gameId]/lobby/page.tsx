import LobbyPage from "./LobbyPage";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { getUserFromProvidedToken } from "@/utils/auth"; // Your function to decode the user

const prisma = new PrismaClient();

export default async function GameLobbyPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;

  // Retrieve user session from cookies
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  let userId: string | null = null;

  if (token) {
    try {
      const user = await getUserFromProvidedToken(token); // This should return { id: string; email: string; ... }
      userId = user?.userId || null;
    } catch (error) {
      console.error("Failed to fetch user session:", error);
    }
  }

  // Fetch game details (but not teams, since those update dynamically)
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      id: true,
      name: true,
      status: true,
      date: true,
      hostingSite: { select: { name: true, location: true } },
    },
  });

  if (!game) {
    return <p>Error: Game not found</p>;
  }

  const formatDateUTC = (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()}`;
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800">Game Lobby</h1>

      {/* Game Details */}
      <div className="mt-4 p-4 bg-white shadow rounded">
        <h2 className="text-xl font-semibold">{game.name}</h2>
        <p className="text-gray-600">
          Location: {game.hostingSite?.name} ({game.hostingSite?.location})
        </p>
        <p className="text-gray-600">Start Time: {formatDateUTC(game.date.toString())}</p>
      </div>

      {/* 🚀 Ensure userId is not null before rendering LobbyPage */}
      {userId ? <LobbyPage gameId={gameId} captainId={userId} /> : <p>Loading user...</p>}
    </div>
  );
}
