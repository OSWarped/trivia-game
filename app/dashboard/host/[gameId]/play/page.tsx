'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
//import { io } from 'socket.io-client';
import { getSocket } from '@/lib/socket-client';
import { GameState } from '@prisma/client';

////const websocketURL = process.env.NEXT_PUBLIC_WEBSOCKET_URL?.trim() || 'http://localhost:3009';

//console.log("🔌 Connecting to socket at:", websocketURL);


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
      answers: unknown[];
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
  const [teamAnswers, setTeamAnswers] = useState<{
    teamId: string;
    teamName: string;
    questionId: string;
    given: string;
    isCorrect: boolean | null;
    awardedPoints: number;
  }[]>([]);


  useEffect(() => {
    const socket = getSocket();
    
    if (!gameId) return;
  
    const setup = async () => {
      try {
        // ✅ Step 1: Fetch game state first
        const res = await fetch(`/api/host/games/${gameId}/state`);
        if (!res.ok) throw new Error("Failed to fetch game state");
        const data = await res.json();
        setGameState(data);
  
        // ✅ Step 2: Join room and request live teams
        socket.emit('host:join', { gameId });
        socket.emit('host:requestLiveTeams', { gameId });
  
        // ✅ Step 3: Handle live teams
        const handleLiveTeams = (data: { gameId: string; teams: { id: string; name: string }[] }) => {
          if (data.gameId !== gameId) return;
          setTeamStatus(
            data.teams.map((team) => ({
              id: team.id,
              name: team.name,
              submitted: false,
              answer: null,
              isCorrect: null,
              pointsUsed: null,
            }))
          );
        };
  
        socket.on("host:liveTeams", handleLiveTeams);
  
        // ✅ Step 4: Handle answer submission
        socket.on('host:answerSubmission', async ({ teamId, questionId, answer, pointsUsed }) => {
          if (!data?.gameId) {
            console.warn("Missing gameId in fetched game state");
            return;
          }
  
          console.log(`Fetching answer for team ${teamId} and for question: ${questionId}\n They wagered ${pointsUsed} on the answer: ${answer}`);
  
          const res = await fetch(`/api/host/answers?gameId=${data.gameId}&teamId=${teamId}`);
          const answerData = await res.json();
  
          if (answerData.answer) {
            setTeamAnswers((prev) => [...prev, answerData.answer]);
          }
        });
  
        // ✅ Cleanup
        return () => {
          socket.emit('host:leave', { gameId });
          socket.off("host:liveTeams", handleLiveTeams);
          socket.off("host:answerSubmission");
        };
      } catch (err) {
        console.error("Setup error in host page:", err);
      }
    };
  
    setup();
  }, [gameId]);

  const handleScore = async (
    teamId: string,
    questionId: string,
    isCorrect: boolean
  ) => {
    try {
      const res = await fetch("/api/host/score-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, questionId, isCorrect }),
      });
  
      if (!res.ok) throw new Error("Failed to update score");
  
      // Optionally update UI
      setTeamAnswers((prev) =>
        prev.map((a) =>
          a.teamId === teamId && a.questionId === questionId
            ? { ...a, isCorrect }
            : a
        )
      );
    } catch (err) {
      console.error("Error scoring answer:", err);
    }
  };
  

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
  <aside className="w-64 bg-gray-100 p-4 border-r shadow-inner">
  <h2 className="text-lg font-semibold mb-4 text-gray-700">👥 Teams</h2>
  <div className="space-y-3">
    {teamStatus.map((team) => (
      <div
        key={team.id}
        className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center"
      >
        <span className="text-gray-800 font-medium">{team.name}</span>
        <span className="text-blue-600 font-bold text-sm">{team.score ?? 0} pts</span>
      </div>
    ))}
  </div>
</aside>

  {/* Main Content */}
  <main className="flex-1 p-8 space-y-6">
  <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-2">🎯 Host Game Dashboard</h1>

  {gameState && (
    <section className="bg-white p-6 border-l-4 border-blue-500 rounded-lg shadow-md space-y-6">
      <h2 className="text-2xl font-semibold text-blue-800 flex items-center gap-2">
        📊 Current Game Progress
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 shadow-sm">
          <p className="text-sm text-blue-700 font-semibold uppercase tracking-wide">
            Current Round
          </p>
          <p className="text-lg font-bold text-blue-900 mt-1">
            {gameState.game.rounds.find(r => r.id === gameState.currentRoundId)?.name || "—"}
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-md p-4 shadow-sm">
          <p className="text-sm text-green-700 font-semibold uppercase tracking-wide">
            Current Question
          </p>
          <p className="text-lg font-medium text-green-900 mt-1">
            {gameState.game.rounds
              .find(r => r.id === gameState.currentRoundId)
              ?.questions.find(q => q.id === gameState.currentQuestionId)?.text || "No active question"}
          </p>
        </div>
      </div>

      <RevealAnswer
        question={
          gameState.game.rounds
            .find(r => r.id === gameState.currentRoundId)
            ?.questions.find(q => q.id === gameState.currentQuestionId) || null
        }
      />
    </section>
  )}

{teamAnswers.length > 0 && (
  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
    {teamAnswers.map((answer, index) => (
      <div
        key={index}
        className="border rounded-lg p-4 shadow bg-white flex flex-col gap-2"
      >
        <div className="text-lg font-semibold">{answer.teamName}</div>
        <div className="text-gray-700">
          Answered: <span className="font-medium">{answer.given}</span>
        </div>
        <div className="text-gray-500 text-sm">
          Points Wagered: {answer.awardedPoints}
        </div>

        <div className="flex gap-2 mt-2">
          <button
            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
            onClick={() => handleScore(answer.teamId, answer.questionId, true)}
          >
            Mark Correct
          </button>
          <button
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
            onClick={() => handleScore(answer.teamId, answer.questionId, false)}
          >
            Mark Incorrect
          </button>
        </div>
      </div>
    ))}
  </div>
)}
</main>

</div>


  );
}
