'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001'); // WebSocket server URL

interface Team {
  id: string;
  name: string;
  score: number;
}

interface GameState {
  scoresVisibleToPlayers: boolean;
}

export default function ScoresPage() {
  const { gameId } = useParams(); // Extract gameId from the route
  const [teams, setTeams] = useState<Team[]>([]);
  const [, setGameState] = useState<GameState | null>(null);
  const router = useRouter();

  // Fetch initial data
  useEffect(() => {
    const fetchScores = async () => {
      try {
        const response = await fetch(`/api/games/${gameId}/scores`);
        if (!response.ok) throw new Error('Failed to fetch scores');
        const data = await response.json();
        setTeams(data.teams);
        setGameState({ scoresVisibleToPlayers: data.scoresVisibleToPlayers });
      } catch (error) {
        console.error('Error fetching scores:', error);
        router.push(`/join/${gameId}`); // Redirect to the player's game page if scores are not visible
      }
    };

    fetchScores();
  }, [gameId, router]);

  // Listen for WebSocket updates
  useEffect(() => {
    socket.on('game:scoresVisibilityChanged', ({ scoresVisibleToPlayers }) => {
      if (!scoresVisibleToPlayers) {
        router.push(`/join/${gameId}`); // Redirect to the player's game page if scores are hidden
      }
    });

    socket.on('game:scoreUpdate', (updatedTeams) => {
      setTeams(updatedTeams); // Update scores dynamically
    });

    return () => {
      socket.off('game:scoresVisibilityChanged');
      socket.off('game:scoreUpdate');
    };
  }, [gameId, router]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Leaderboard</h1>
      <table className="table-auto w-full border-collapse border border-gray-300">
        <thead>
          <tr>
            <th className="border border-gray-300 px-4 py-2">Rank</th>
            <th className="border border-gray-300 px-4 py-2">Team Name</th>
            <th className="border border-gray-300 px-4 py-2">Score</th>
          </tr>
        </thead>
        <tbody>
          {teams
            .sort((a, b) => b.score - a.score) // Sort teams by score (descending)
            .map((team, index) => (
              <tr key={team.id}>
                <td className="border border-gray-300 px-4 py-2 text-center">{index + 1}</td>
                <td className="border border-gray-300 px-4 py-2">{team.name}</td>
                <td className="border border-gray-300 px-4 py-2 text-center">{team.score}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
