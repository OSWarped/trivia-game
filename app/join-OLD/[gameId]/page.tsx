"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { SubQuestionAnswer } from "@prisma/client";

const websocketURL = process.env.NEXT_PUBLIC_WEBSOCKET_URL;
const socket = io(websocketURL);

interface GameState {
  game: {
    id: string;
    name: string;
    status: string; // e.g., "IN_PROGRESS", "COMPLETED"
    currentRound: {
      id: string;
      name: string;
      roundType: string; // e.g., "POINT_BASED"
      pointSystem: "POOL" | "FLAT"; // Type of point system
      pointPool?: number[]; // For pool-based rounds (if applicable)
      pointValue?: number; // For flat point-based rounds (if applicable)
    } | null;

    currentQuestion: {
      id: string;
      text: string; // The question text visible to players
      type: "SINGLE" | "ORDERED" | "MULTIPLE_CHOICE" | "WAGER" | "IMAGE"; // Question type
      subquestions?: {
        id: string;
        text: string; // Subquestion text
        subAnswers: SubQuestionAnswer[];
      }[]; // Array of subquestions for multi-part questions
    } | null;
  };

  team: {
    id: string;
    name: string;
    remainingPoints: number[]; // Points available for the team
    submittedAnswer?: {
      answer: string; // For single-answer questions
      pointsUsed: number; // Points wagered/used for the answer
    } | null;
    submittedSubAnswers?: {
      subquestionId: string;
      answer: string; // Answer for the specific subquestion
    }[]; // Array of submitted answers for subquestions
  };
}


export default function JoinGamePage() {
  const { gameId } = useParams();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [subAnswers, setSubAnswers] = useState<Record<string, string>>({});
  const [answer, setAnswer] = useState("");
  const [selectedPoints, setSelectedPoints] = useState<number | "">("");
  const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false); // New state to track submission
  const [teamScore, setTeamScore] = useState<number | null>(null); // NEW: Track team score
  const router = useRouter();

  useEffect(() => {
    if (!gameId) return;
  
    const fetchGameState = async () => {
      try {
        const response = await fetch(`/api/games/${gameId}/state`);
        if (!response.ok) throw new Error("Failed to fetch game state");
  
        const data: GameState = await response.json();
        setGameState(data);
  
        // Check if subquestions exist and initialize subAnswers state
      if (data.game.currentQuestion?.subquestions) {
        const initialSubAnswers = data.game.currentQuestion.subquestions.reduce(
          (acc, sub) => ({ ...acc, [sub.id]: "" }),
          {}
        );
        setSubAnswers(initialSubAnswers);
      }
  
        // Determine if answers or subanswers have been submitted
      if (data.game.currentQuestion?.subquestions?.length) {
        // For subquestions, check if subanswers exist
        const hasSubAnswers = data.game.currentQuestion.subquestions.every(
          (sub) => sub.subAnswers.some((sa) => sa.answer) // Check if any answer exists
        );

        if (hasSubAnswers) {
          setSubmissionStatus("Subanswers already submitted!");
          setHasSubmitted(true);
        }
      } else if (data.team?.submittedAnswer) {
        // For single-answer questions
        setSubmissionStatus("Answer already submitted!");
        setAnswer(data.team.submittedAnswer.answer);
        setSelectedPoints(data.team.submittedAnswer.pointsUsed);
        setHasSubmitted(true);
      }
      } catch (err) {
        console.error("Error fetching game state:", err);
      }
    };

    const fetchTeamScore = async () => {
      try {
        const response = await fetch(`/api/games/${gameId}/team-score`);
        if (!response.ok) throw new Error("Failed to fetch team score");

        const data = await response.json();
        setTeamScore(data.teamScore);
      } catch (err) {
        console.error("Error fetching team score:", err);
      }
    };
  
    fetchGameState();
    fetchTeamScore();
  
    // WebSocket events for state updates
    socket.on("state:updated", async (data) => {
      if (data.gameId === gameId) {
        try {
          const response = await fetch(`/api/games/${gameId}/state`);
          if (!response.ok) throw new Error("Failed to fetch game state");
          const updatedGameState: GameState = await response.json();
  
          // Check if the question has changed
          const questionChanged =
            updatedGameState.game.currentQuestion?.id !== gameState?.game.currentQuestion?.id;
  
          setGameState(updatedGameState);
          await fetchTeamScore(); // Refresh team score when game state updates
  
          if (questionChanged) {
            // Reset the answer, subAnswers, and submission status if the question has changed
            setSubmissionStatus(null);
            setAnswer("");
            setSelectedPoints("");
            setHasSubmitted(false);
  
            // If subquestions exist, initialize subAnswers state with empty values
          if (updatedGameState.game.currentQuestion?.subquestions) {
            const initialSubAnswers =
              updatedGameState.game.currentQuestion.subquestions.reduce(
                (acc, sub) => ({ ...acc, [sub.id]: "" }),
                {}
              );
            setSubAnswers(initialSubAnswers);
          }
        } else if (
          updatedGameState.game.currentQuestion?.subquestions?.length
        ) {
          // For subquestions, check if subanswers exist
          const hasSubAnswers = updatedGameState.game.currentQuestion.subquestions.every(
            (sub) => sub.subAnswers.some((sa) => sa.answer) // Check if any answer exists
          );

          if (hasSubAnswers) {
            setSubmissionStatus("Subanswers already submitted!");
            setHasSubmitted(true);
          }
        } else if (updatedGameState.team?.submittedAnswer) {
          // Update the submitted answer status for single-answer questions
          setSubmissionStatus("Answer already submitted!");
          setAnswer(updatedGameState.team.submittedAnswer.answer);
          setSelectedPoints(updatedGameState.team.submittedAnswer.pointsUsed);
          setHasSubmitted(true);
        }
        } catch (err) {
          console.error("Error fetching updated game state:", err);
        }
      }
    });
  
    // Listen for the transition event from the host
    socket.on("game:transition", (data) => {
      console.log("Transition event received:", data);
  
      // Handle transition by updating the local game state
      setGameState((prev) => {
        if (!prev) {
          return null;
        }
  
        return {
          ...prev,
          isTransitioning: true,
          game: {
            ...prev.game,
            currentRound: null,
            currentQuestion: null,
          },
        };
      });
  
      // Redirect to a transition screen if applicable
      const query = new URLSearchParams({
        gameId: data.gameId,
        transitionMessage: data.transitionMessage || "",
        transitionMedia: data.transitionMedia || "",
        adEmbedCode: data.adEmbedCode || "",
      }).toString();
      router.push(`/transition?${query}`);
    });
  
    // Listen for score visibility change from the host
    socket.on("game:scoresVisibilityChanged", ({ scoresVisibleToPlayers }) => {
      console.log(
        `Client received signal about score visibility change. Game ID: ${gameId}, Scores visible: ${scoresVisibleToPlayers}`
      );
      if (scoresVisibleToPlayers) {
        router.push(`/join/${gameId}/scores`);
      } else {
        router.push(`/join/${gameId}`);
      }
    });
  
    // Listen for End Game
    socket.on("game:gameCompleted", ({ gameId }) => {
      console.log(`Host has ended game ${gameId}`);
      router.push("/dashboard");
    });
  
    return () => {
      socket.off("state:updated");
      socket.off("game:transition");
      socket.off("game:scoresVisibilityChanged");
      socket.off("game:gameEnded");
    };
  }, [gameId, gameState?.game.currentQuestion?.id, router]);
  

  const handleSubAnswerChange = (subquestionId: string, value: string) => {
    setSubAnswers((prev) => ({
      ...prev,
      [subquestionId]: value,
    }));
  };

  
  const handleAnswerSubmit = async () => {
    if (!gameState?.team.id || !gameState.game.id) {
      setSubmissionStatus("Game or team information is missing.");
      return;
    }
  
    const hasSubquestions =
      gameState.game.currentQuestion?.subquestions &&
      gameState.game.currentQuestion.subquestions.length > 0;
  
    const pointsUsed =
      gameState?.game.currentRound?.pointSystem === "POOL"
        ? selectedPoints
        : gameState?.game.currentRound?.pointValue;
  
    // Validate single answer submission
    if (!hasSubquestions) {
      if (!answer) {
        setSubmissionStatus("Please enter an answer.");
        return;
      }
  
      if (pointsUsed === undefined || pointsUsed === null) {
        setSubmissionStatus("Invalid point selection.");
        return;
      }
  
      // Payload for single-answer questions
      const payload = {
        teamId: gameState.team.id,
        questionId: gameState.game.currentQuestion?.id,
        pointsUsed,
        answer,
        pointSystem: gameState.game.currentRound?.pointSystem,
      };
  
      try {
        // Submit the single answer
        const response = await fetch(`/api/games/${gameState.game.id}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
  
        if (!response.ok) throw new Error("Failed to submit answer");
  
        // Emit WebSocket event
        socket.emit("team:submitAnswer", payload);
  
        setSubmissionStatus("Answer submitted successfully!");
        setHasSubmitted(true);
      } catch (err) {
        console.error("Error submitting answer:", err);
        setSubmissionStatus("Failed to submit answer. Please try again.");
      }
      return;
    }
  
    // Validate subquestion submission
    if (hasSubquestions) {
      const unanswered = Object.entries(subAnswers).filter(([, answer]) => !answer);
      if (unanswered.length > 0) {
        setSubmissionStatus("Please answer all subquestions.");
        return;
      }
  
      // Payload for subquestions
      const payload = {
        gameId: gameState.game.id, // Include the gameId here
        teamId: gameState.team.id,
        subAnswers: Object.entries(subAnswers).map(([subquestionId, answer]) => ({
          subquestionId,
          answer,        
        })),
        pointSystem: gameState.game.currentRound?.pointSystem,
      };
  
      try {
        // Submit the subanswers
        const response = await fetch(`/api/games/${gameState.game.id}/subanswer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
  
        if (!response.ok) throw new Error("Failed to submit subanswers");
  
        // Emit WebSocket event
        socket.emit("team:submitSubAnswers", payload);
  
        setSubmissionStatus("Subanswers submitted successfully!");
        setHasSubmitted(true);
      } catch (err) {
        console.error("Error submitting subanswers:", err);
        setSubmissionStatus("Failed to submit subanswers. Please try again.");
      }
    }
  };
  
  

  if (!gameState) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h1 className="text-3xl font-semibold text-center mb-8">{gameState.game.name}</h1>

       {/* 🔹 NEW: Team Info Section 🔹 */}
       <div className="mb-6 p-4 bg-gray-100 rounded-lg shadow">
        <p className="text-gray-700 text-md">
          <strong>Team Name:</strong> {gameState.team.name}
        </p>
        <p className="text-gray-700 text-md">
          <strong>Current Score:</strong> {teamScore !== null ? teamScore : "Loading..."}
        </p>
      </div>
  
      {gameState.game.currentRound && (
        <p className="text-lg mb-4">
          <strong>Current Round:</strong> {gameState.game.currentRound.name}
        </p>
      )}
  
      {gameState.game.currentQuestion ? (
        <div className="mb-8">
          <p className="text-xl mb-4">{gameState.game.currentQuestion.text}</p>
  
          {hasSubmitted ? ( // Check if the answer has been submitted
            <p className="text-lg text-green-600">
              Your team has submitted your answers.
            </p>
          ) : (
            <>
              {/* Points Selection */}
              {gameState.game.currentRound?.pointSystem === "POOL" ? (
                <div className="mb-4">
                  <label className="block text-lg font-semibold mb-2">Select Points to Use:</label>
                  <select
                    className="border p-2 rounded w-full"
                    value={selectedPoints}
                    onChange={(e) => setSelectedPoints(Number(e.target.value))}
                  >
                    <option value="">-- Select Points --</option>
                    {gameState.team?.remainingPoints.map((points) => (
                      <option key={points} value={points}>
                        {points}
                      </option>
                    ))}
                  </select>
                </div>
              ) : gameState.game.currentRound?.pointSystem === "FLAT" && (
                <div className="mb-4">
                  {gameState.game.currentQuestion.subquestions?.length ? (
                    <p className="text-lg">
                      Each subquestion is worth:{" "}
                      <strong>
                        {gameState.game.currentRound?.pointValue}{" "}
                        {gameState.game.currentRound?.pointValue === 1 ? "Point" : "Points"}
                      </strong>
                    </p>
                  ) : (
                    <p className="text-lg">
                      This question is worth:{" "}
                      <strong>
                        {gameState.game.currentRound?.pointValue}{" "}
                        {gameState.game.currentRound?.pointValue === 1 ? "Point" : "Points"}
                      </strong>
                    </p>
                  )}
                </div>
              )
              
              }
  
              {/* Subquestions UI */}
              {gameState.game.currentQuestion.subquestions?.length ? (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">Answer each part:</h3>
                  {gameState.game.currentQuestion.subquestions.map((sub) => (
                    <div key={sub.id} className="mb-4">
                      <label className="block text-lg font-semibold mb-2">
                        {sub.text}
                      </label>
                      <input
                        type="text"
                        className="border p-2 rounded w-full"
                        placeholder={`Enter your answer for "${sub.text}"`}
                        value={subAnswers[sub.id] || ""}
                        onChange={(e) =>
                          handleSubAnswerChange(sub.id, e.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
              ) : (
                // Single Question Input
                <div className="mb-6">
                  <input
                    type="text"
                    className="border p-2 rounded w-full mb-4"
                    placeholder="Enter your answer"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                  />
                </div>
              )}
  
              {/* Submit Button */}
              <button
                onClick={handleAnswerSubmit}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Submit Answer
              </button>
            </>
          )}
  
          {submissionStatus && <p className="mt-4">{submissionStatus}</p>}
        </div>
      ) : (
        <p className="text-lg text-gray-600">No active question at the moment.</p>
      )}
    </div>
  );
  
}
