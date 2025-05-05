'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import { GameState } from '@prisma/client';

const websocketURL = process.env.NEXT_PUBLIC_WEBSOCKET_URL;
const socket = io(websocketURL);

interface Question {
  id: string;
  text: string;
  type: 'SINGLE' | 'MULTIPLE_CHOICE' | 'ORDERED' | 'WAGER';
  options: { id: string; text: string; isCorrect: boolean }[];
}

interface GameStateExpanded extends GameState {
  game: {
    rounds: Round[];
    teamGames: {
      team: { id: string; name: string };
      score?: number;
      answers: any[];
    }[];
  };
}


interface Round {
  id: string;
  name: string;
  questions: Question[];
  pointSystem: 'POOL' | 'FLAT';
  pointPool?: number[];
  pointValue?: number;
  sortOrder: number;
}

interface TeamStatus {
  id: string;
  name: string;
  score?: number;
  submitted: boolean;
  answer?: string | null;
  isCorrect?: boolean | null;
  pointsUsed?: number | null;
}


export default function HostGameInterface() {
  const { gameId } = useParams();
  const [teamStatus, setTeamStatus] = useState<TeamStatus[]>([]);
  const [gameState, setGameState] = useState<GameStateExpanded | null>(null);


  useEffect(() => {
    if (!gameId) return;
  
    socket.emit('host:requestLiveTeams', { gameId });
  
    const handleLiveTeams = async (data: { gameId: string; teams: string[] }) => {
      if (data.gameId !== gameId) return;
  
      try {
        // Fetch full team info from your API using the array of IDs
        const res = await fetch(`/api/host/games/${gameId}/teams`);
        const fullTeamList = await res.json(); // [{ id, name }, ...]
  
        // Match the IDs from websocket with the full objects
        const liveTeams = fullTeamList.filter((team: { id: string }) =>
          data.teams.includes(team.id)
        );
  
        setTeamStatus(
          liveTeams.map((team: { id: any; name: any; }) => ({
            id: team.id,
            name: team.name,
            submitted: false,
            answer: null,
            isCorrect: null,
            pointsUsed: null,
          }))
        );
      } catch (err) {
        console.error("Error fetching full team info:", err);
      }
    };
  
    socket.on("host:liveTeams", handleLiveTeams);
  
    return () => {
      socket.off("host:liveTeams", handleLiveTeams);
    };
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;
  
    const fetchGameState = async () => {
      try {
        const res = await fetch(`/api/host/games/${gameId}/state`);
        if (!res.ok) throw new Error("Failed to fetch game state");
        const data = await res.json();
        setGameState(data); // <- Add `gameState` to your state
      } catch (err) {
        console.error("Error fetching GameState:", err);
      }
    };
  
    fetchGameState();
  }, [gameId]);

  function RevealAnswer({ question }: { question: Question | null }) {
    const [revealed, setRevealed] = useState(false);
  
    if (!question) return null;
  
    return (
      <div className="mt-4">
        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="bg-yellow-400 text-gray-900 font-semibold px-4 py-2 rounded hover:bg-yellow-500"
          >
            Reveal Correct Answer
          </button>
        ) : (
          <div className="bg-yellow-100 p-4 mt-2 rounded border border-yellow-300">
            <h3 className="font-semibold mb-2 text-gray-700">Correct Answer:</h3>
            <ul className="list-disc list-inside text-gray-800">
              {question.options.filter(opt => opt.isCorrect).map((opt) => (
                <li key={opt.id}>{opt.text}</li>
              ))}
            </ul>
            <button
              onClick={() => setRevealed(false)}
              className="mt-3 text-sm text-blue-700 hover:underline"
            >
              Hide Answer
            </button>
          </div>
        )}
      </div>
    );
  }
  
  
  

  return (
    <div className="flex min-h-screen bg-gray-50">
  {/* Sidebar with Teams */}
  <aside className="w-64 bg-white p-4 border-r shadow-inner">
    <h2 className="text-lg font-semibold mb-4 text-gray-700">Teams</h2>
    <ul className="space-y-2">
      {teamStatus.map((team) => (
        <li key={team.id} className="flex justify-between items-center border-b py-1">
          <span className="text-sm text-gray-800">{team.name}</span>
          <span className="text-sm font-bold text-blue-700">{team.score ?? 0}</span>
        </li>
      ))}
    </ul>
  </aside>

  {/* Main Content */}
  <main className="flex-1 p-8 space-y-6">
    <h1 className="text-3xl font-bold text-gray-800 mb-4">Host Game Dashboard</h1>

    {gameState && (
      <section className="bg-white p-6 border border-blue-200 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-blue-800 mb-4">Current Game Progress</h2>

        <div className="space-y-4">
          <div>
            <p className="text-gray-600 font-semibold">Current Round</p>
            <p className="text-lg text-gray-900">
              {gameState.game.rounds.find(r => r.id === gameState.currentRoundId)?.name || "—"}
            </p>
          </div>

          <div>
            <p className="text-gray-600 font-semibold">Current Question</p>
            <p className="text-lg text-gray-900">
              {gameState.game.rounds
                .find(r => r.id === gameState.currentRoundId)
                ?.questions.find(q => q.id === gameState.currentQuestionId)?.text || "No active question"}
            </p>
          </div>

          {/* Reveal Answer Button */}
          <RevealAnswer question={
            gameState.game.rounds
              .find(r => r.id === gameState.currentRoundId)
              ?.questions.find(q => q.id === gameState.currentQuestionId) || null
          } />
        </div>
      </section>
    )}
  </main>
</div>


  );
}
