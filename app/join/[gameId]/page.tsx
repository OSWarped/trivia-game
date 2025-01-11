"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { io } from "socket.io-client";

const websocketURL = process.env.NEXT_PUBLIC_WEBSOCKET_URL;
console.log("connection to " + websocketURL);

//const socket = io(websocketURL); // Ensure this matches your WebSocket server URL
//const socket = io('http://192.168.1.75:3009');
const socket = io('http://104.56.124.234:3009');



interface GameState {
  game: {
    id: string;
    name: string;
    status: string;
    currentRound: {
      id: string;
      name: string;
      roundType: string;
      pointSystem: 'POOL' | 'FLAT'; // New field for the point system
      pointPool?: number[]; // Optional for point pool rounds
      pointValue?: number;  // Optional for flat point rounds
      maxPoints?: number;
    } | null;
    currentQuestion: {
      id: string;
      text: string;
    } | null;
  };
  teams: Array<{
    id: string;
    name: string;
    remainingPoints: number[];
  }>;
}

export default function JoinGamePage() {
  const { gameId } = useParams();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userTeam, setUserTeam] = useState<{ id: string; remainingPoints: number[] } | null>(
    null
  );
  const [answer, setAnswer] = useState("");
  const [selectedPoints, setSelectedPoints] = useState<number | "">("");
  const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submittedAnswer, setSubmittedAnswer] = useState<{ answer: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!gameId) return;

    const fetchGameState = async () => {
      try {
        const response = await fetch(`/api/games/${gameId}/state`);
        if (!response.ok) throw new Error("Failed to fetch game state");
        const data: GameState = await response.json();
        setGameState(data);
      } catch (err) {
        console.error("Error fetching game state:", err);
        setError("Could not fetch game data.");
      }
    };

    const fetchUserId = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) throw new Error("Failed to fetch user ID");
        const data = await response.json();
        setUserId(data.user.id);
      } catch (err) {
        console.error("Error fetching user ID:", err);
        setError("Could not fetch user information.");
      }
    };

    const fetchUserTeam = async (currentUserId: string) => {
      try {
        console.log("attempting get the user's team...")
        const response = await fetch(`/api/teams/users/${currentUserId}?gameId=${gameId}`);
        if (!response.ok) throw new Error("Failed to fetch user's team");
        const team = await response.json();
        console.log('got users team: ' + team);
        setUserTeam(team);
      } catch (err) {
        console.error("Error fetching user team:", err);
        setError("Could not fetch user's team.");
      }
    };

    const initialize = async () => {
      await fetchGameState();
      await fetchUserId();
    };

    initialize().then(() => {
      if (userId) {

        fetchUserTeam(userId);
      }
    });

    // WebSocket Events
    socket.on("state:updated", async (data) => {
      if (data.gameId === gameId) {
        try {
          const response = await fetch(`/api/games/${gameId}/state`);
          if (!response.ok) throw new Error("Failed to fetch game state");
          const updatedGameState: GameState = await response.json();
          setGameState(updatedGameState);
        } catch (err) {
          console.error("Error fetching updated game state:", err);
        }
      }
    });

    socket.on("game:currentQuestion", (data) => {
      setSubmittedAnswer(null);
      setSubmissionStatus(null);
      setGameState((prevState) =>
        prevState
          ? {
              ...prevState,
              game: {
                ...prevState.game,
                currentQuestion: data.question,
              },
            }
          : null
      );
    });

    // Listen for the transition event from the host
    socket.on("game:transition", (data) => {
      console.log("Transition event received:", data);

      // Redirect to the transition page with query parameters
      const query = new URLSearchParams({
        gameId: data.gameId,
        transitionMessage: data.transitionMessage || "",
        transitionMedia: data.transitionMedia || "",
        adEmbedCode: data.adEmbedCode || "",
      }).toString();

      router.push(`/transition?${query}`);
    });

    //Listen for score visibilty change from host
    socket.on('game:scoresVisibilityChanged', ({ scoresVisibleToPlayers }) => {
      console.log("Clinet received signal about score visibility changed.\n Game ID " + gameId + " scores visibility set to " + scoresVisibleToPlayers);
      if (scoresVisibleToPlayers) {
        router.push(`/join/${gameId}/scores`);
      } else {
        router.push(`/join/${gameId}`);
      }
    });
    
    //Listen for End Game
    socket.on('game:gameCompleted', ({ gameId }) => {
      console.log('Host has ended game ' + gameId);
      router.push('/dashboard');
    });

    return () => {
      socket.off("state:updated");
      socket.off("game:currentQuestion");
      socket.off("game:transition");
      socket.off('game:scoresVisibilityChanged');
      socket.off('game:gameEnded');
    };
  }, [gameId, userId, router]);

  const handleAnswerSubmit = async () => {
    if (!answer || !userTeam?.id) {
      setSubmissionStatus("Please enter an answer.");
      return;
    }
  
    const pointsUsed =
      gameState?.game.currentRound?.pointSystem === 'POOL'
        ? selectedPoints
        : gameState?.game.currentRound?.pointValue;
  
    if (pointsUsed === undefined || pointsUsed === null) {
      setSubmissionStatus("Invalid point selection.");
      return;
    }
  
    try {
      const payload = {
        teamId: userTeam.id,
        questionId: gameState?.game.currentQuestion?.id,
        answer,
        pointsUsed,
      };
  
      console.log("trying to submit answer: " + JSON.stringify(payload));
      const response = await fetch(`/api/games/${gameId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
  
      if (!response.ok) throw new Error("Failed to submit answer");
  
      socket.emit("team:submitAnswer", payload);
  
      setSubmissionStatus("Answer submitted successfully!");
      setAnswer("");
      setSelectedPoints("");
      setSubmittedAnswer({ answer });
    } catch (err) {
      console.error("Error submitting answer:", err);
      setSubmissionStatus("Failed to submit answer. Please try again.");
    }
  };
  

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  if (!gameState || !userTeam) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h1 className="text-3xl font-semibold text-center mb-8">{gameState.game.name}</h1>
  
      {gameState.game.currentRound && (
        <p className="text-lg mb-4">
          <strong>Current Round:</strong> {gameState.game.currentRound.name}
        </p>
      )}
  
      {gameState.game.currentQuestion ? (
        <div className="mb-8">
          <p className="text-xl mb-4">{gameState.game.currentQuestion.text}</p>
  
          {submittedAnswer ? (
            <p className="text-lg text-green-600">
              Your team has submitted: <strong>{submittedAnswer.answer}</strong>
            </p>
          ) : (
            <>
              {gameState.game.currentRound?.pointSystem === "POOL" ? (
                // Point pool dropdown for selecting points
                <div className="mb-4">
                  <label className="block text-lg font-semibold mb-2">Select Points to Use:</label>
                  <select
                    className="border p-2 rounded w-full"
                    value={selectedPoints}
                    onChange={(e) => setSelectedPoints(Number(e.target.value))}
                  >
                    <option value="">-- Select Points --</option>
                    {gameState.teams
                      .find((team) => team.id === userTeam.id)?.remainingPoints
                      .map((points) => (
                        <option key={points} value={points}>
                          {points}
                        </option>
                      ))}
                  </select>
                </div>
              ) : gameState.game.currentRound?.pointSystem === "FLAT" ? (
                // Display fixed point value for flat system
                <div className="mb-4">
                  <p className="text-lg">
                    This question is worth: <strong>{gameState.game.currentRound?.pointValue} Points</strong>
                  </p>
                </div>
              ) : null}
  
              {/* Answer input field */}
              <input
                type="text"
                className="border p-2 rounded w-full mb-4"
                placeholder="Enter your answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
  
              {/* Submit answer button */}
              <button
                onClick={handleAnswerSubmit}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Submit Answer
              </button>
            </>
          )}
  
          {/* Display submission status */}
          {submissionStatus && <p className="mt-4">{submissionStatus}</p>}
        </div>
      ) : (
        <p className="text-lg text-gray-600">No active question at the moment.</p>
      )}
    </div>
  );
  
}
