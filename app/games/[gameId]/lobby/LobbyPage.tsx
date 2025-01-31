"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

interface Team {
  id: string;
  name: string;
  captain: { id: string; name: string };
}

export default function LobbyPage({ gameId, captainId }: { gameId: string; captainId: string }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3009");
    setSocket(newSocket);

    // 🔹 Step 1: Fetch Initial Teams
    const fetchTeams = async () => {
      try {
        console.log(`🛠 Fetching teams for game ${gameId}...`);
        const res = await fetch(`/api/games/${gameId}/teams`);
        const data = await res.json();
        console.log("✅ API: Initial teams in lobby:", data.teams);
        setTeams(data.teams);
      } catch (error) {
        console.error("❌ Error fetching teams:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams(); // Fetch teams when the component mounts

    // 🔹 Step 2: WebSocket Connection
    newSocket.on("connect", () => {
      console.log("✅ WebSocket connected:", newSocket.id);

      // Emit that the captain has joined
      if (gameId && captainId) {
        console.log(`🚀 Emitting 'team:join_lobby' for game ${gameId}, captain ${captainId}`);
        newSocket.emit("team:join_lobby", { gameId, captainId });
      }
    });

    // 🔹 Step 3: Listen for Updates (Prevent Duplicates)
    newSocket.on("team:update", (update) => {
      console.log("🔄 Received 'team:update':", update);

      console.log("🔄 Received 'team:update', refreshing list...");
  fetchTeams(); // Calls the API again to get the latest teams in the lobby
    });

    // 🔹 Step 4: Handle Game Start
    newSocket.on("game_started", () => {
      console.log("🚀 Game started! Redirecting players...");
      window.location.href = `/games/${gameId}/play`;
    });

    // 🔹 Step 5: Handle Captain Leaving (Disconnecting)
    const handleBeforeUnload = () => {
      console.log(`❌ Emitting 'team:leave_lobby' for captain ${captainId}`);
      newSocket.emit("team:leave_lobby", { gameId, captainId });
    };

    window.addEventListener("beforeunload", handleBeforeUnload); // Detects browser close or refresh

    return () => {
      console.log(`❌ Disconnecting WebSocket: ${newSocket.id}`);
      handleBeforeUnload(); // Ensure captain leaves when navigating away
      newSocket.disconnect();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [gameId, captainId]);

  if (loading) {
    return <p>Loading teams...</p>;
  }
  

  return (
    <div>
      <h2 className="mt-6 text-lg font-semibold">Teams in Lobby</h2>
      <ul className="mt-2 bg-white shadow rounded p-4">
        {teams.length > 0 ? (
          teams.map((team) => (
            <li key={team.id} className="p-4 bg-gray-50 rounded-lg shadow-md flex justify-between">
              <span className="font-medium text-blue-700">{team.name}</span>
              <span className="text-gray-500">Captain: {team.captain?.name}</span>
            </li>
          ))
        ) : (
          <p className="text-gray-500">No teams have joined yet.</p>
        )}
      </ul>

      <p className="mt-6 text-gray-600 text-sm">Waiting for the host to start the game...</p>
    </div>
  );
}
