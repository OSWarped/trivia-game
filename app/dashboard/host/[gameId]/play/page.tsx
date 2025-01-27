'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { io } from 'socket.io-client';

const websocketURL = process.env.NEXT_PUBLIC_WEBSOCKET_URL

console.log("connection to " + websocketURL);
const socket = io(websocketURL); // WebSocket server URL
//const socket = io('http://192.168.1.75:3009');
//const socket = io('http://104.56.124.234:3009');



interface Round {
  id: string;
  name: string;
  questions: Question[];
  pointSystem: 'POOL' | 'FLAT'; // Add this property
  pointPool?: number[];
  pointValue?: number;
  sortOrder: number;
}

interface TeamStatus {
  id: string;
  name: string;
  submitted: boolean; // Whether the team has submitted answers
  answer?: string | null; // For single questions without subquestions
  pointsUsed?: number | null; // Points used for the answer (if applicable)
  isCorrect?: boolean | null; // Overall correctness of the team's submission
  subAnswers?: {
    subquestionId: string;
    answer: string;
    isCorrect: boolean | null;
    pointsAwarded: number;
  }[]; // List of subanswers submitted for subquestions
}

interface SubAnswer {
  id: string;
  subquestionId: string;
  answer: string;
  isCorrect: boolean | null;
  pointsAwarded: number;
}

interface Subquestion {
  id: string;
  text: string;
  subAnswers: SubAnswer[]; // List of subanswers submitted by teams
}

interface Question {
  id: string;
  text: string;
  type: 'SINGLE' | 'ORDERED' | 'MULTIPLE_CHOICE' | 'WAGER' | 'IMAGE'; // Add question types
  subquestions?: Subquestion[]; // Optional list of subquestions
}

interface GameState {
  id: string;
  currentRoundId: string | null;
  currentQuestionId: string | null;
  isTransitioning?: boolean;
  pointPool?: number[];
  pointsRemaining?: Record<string, number[]>;  
  game: {
    id: string;
    name: string;
    status: string;
    currentRound: {
      id: string;
      name: string;
      pointSystem: 'POOL' | 'FLAT';
      pointPool?: number[];
      pointValue?: number;
    } | null;
    currentQuestion: Question | null;
    teamGames: {
      id: string;
      teamId: string;
      gameId: string;
      team: {
        id: string;
        name: string;
        captainId: string;
        score: number;
        remainingPoints: number[];
      };
    }[];
    rounds: Round[];
  };
  subAnswersByTeam?: Record<
    string,
    {
      subquestionId: string;
      subquestionText: string;
      answer: string;
      isCorrect: boolean;
      pointsAwarded: number;
    }[]
  >
  answersByTeam?: Record<
    string,
    {
      questionId: string;
      questionText: string;
      pointsUsed: number;
      answer: string;
      isCorrect: boolean | null;
      pointsAwarded: number | null;
    }
  >;
}



export default function HostGameInterface() {
  const { gameId } = useParams();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [currentRoundIndex, setCurrentRoundIndex] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number | null>(null);
  const [isLastQuestion, setIsLastQuestion] = useState(false);
  const [teamStatus, setTeamStatus] = useState<TeamStatus[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showLastQuestionMessage, setShowLastQuestionMessage] = useState(false);
  //const [, setError] = useState<string | null>(null);
  const [, setLoading] = useState(false);
  //const router = useRouter();
  //const isLastRound = currentRound?.id === rounds[rounds.length - 1]?.id;
  
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [gameStateRes, roundsRes, teamsRes] = await Promise.all([
          fetch(`/api/host/games/${gameId}/state`),
          fetch(`/api/host/games/${gameId}/rounds`),
          fetch(`/api/host/games/${gameId}/teams`),
        ]);
  
        if (!gameStateRes.ok || !roundsRes.ok || !teamsRes.ok) {
          throw new Error('Failed to fetch initial data');
        }
  
        const gameStateData: GameState = await gameStateRes.json();
        //const roundsData: Round[] = await roundsRes.json();
        //const teamsData: { id: string; name: string }[] = await teamsRes.json();
  
        setGameState(gameStateData);

        // Use gameStateData.game.rounds to populate rounds
        const roundsData = gameStateData.game.rounds;
        setRounds(roundsData);

       console.log("Fetchted Game State:" + JSON.stringify(gameStateData));

        // Determine current round and question
        const currentRoundIdx: number = roundsData.findIndex(
          (round: Round) => round.id === gameStateData.currentRoundId
        );
        setCurrentRoundIndex(currentRoundIdx >= 0 ? currentRoundIdx : null);
  
        const currentRound: Round | null = roundsData[currentRoundIdx] || null;
        setCurrentRound(currentRound);
  
        if (currentRound && gameStateData.currentQuestionId) {
          const currentQuestionIdx: number = currentRound.questions.findIndex(
            (q: Question) => q.id === gameStateData.currentQuestionId
          );
          setCurrentQuestionIndex(currentQuestionIdx >= 0 ? currentQuestionIdx : null);

          const currentQuestion = currentRound.questions[currentQuestionIdx];
          if (currentQuestion) {
            currentQuestion.subquestions = currentQuestion.subquestions || [];
          }
          console.log("Set the Current Question:  Does it have subquestions?: " + currentQuestion.subquestions?.length);
          setCurrentQuestion(currentQuestion || null);
        } else {
          setCurrentQuestion(null);
          setCurrentQuestionIndex(null);
        }
  
        // Initialize `teamStatus`
        //const teamsWithSubAnswers: string[] = Object.keys(gameStateData.subAnswersByTeam || {});

        const isSubquestion = !!gameStateData.game.rounds
        .find((round) => round.id === gameStateData.currentRoundId)
        ?.questions.find((question) => question.id === gameStateData.currentQuestionId)
        ?.subquestions?.length;

        setTeamStatus(
          gameStateData.game.teamGames.map((teamGame) => {
            const teamId = teamGame.team.id;
            const subAnswers = gameStateData.subAnswersByTeam?.[teamId] || [];
            const singleAnswer = gameStateData.answersByTeam?.[teamId] || null; 
  
            return {
              id: teamId,
              name: teamGame.team.name,
              submitted: isSubquestion
                ? subAnswers.length > 0
                : !!singleAnswer,
              subAnswers: isSubquestion ? subAnswers : [],
              answer: isSubquestion ? null : singleAnswer?.answer || null,
              isCorrect: isSubquestion
                ? subAnswers.every((subAnswer) => subAnswer.isCorrect === true)
                : singleAnswer?.isCorrect ?? null,
              pointsUsed: singleAnswer?.pointsUsed ?? null,
            };
          })
        );
      } catch (error: unknown) {
        console.error('Error fetching initial data:', error);
      }
    };
  
    fetchInitialData();
  }, [gameId, teamStatus]);
  
  
  useEffect(() => {
    
    const handleAnswerSubmission = async (data: { teamId: string }) => {
      try {
        console.log('handleAnswerSubmission: Answer received from team:', data.teamId);
  
        // Fetch the updated game state
        const res = await fetch(`/api/host/games/${gameId}/state`);
        if (!res.ok) throw new Error('Failed to fetch updated game state');
        const updatedGameState: GameState = await res.json();
  
        console.log('handleAnswerSubmission: Fetched updated GameState:', updatedGameState);

        
  
        setGameState(updatedGameState); // Update the overall game state
  
        // Derive the current round and question from the game state
        const currentRound = updatedGameState.game.rounds.find(
          (round : Round) => round.id === updatedGameState.currentRoundId
        );
        const currentQuestion = currentRound?.questions.find(
          (question : Question) => question.id === updatedGameState.currentQuestionId
        );
        if (currentQuestion) {
          // Attach subquestions to the current question
          currentQuestion.subquestions = currentQuestion.subquestions || [];
        }
  
        setCurrentRound(currentRound || null);
        setCurrentQuestion(currentQuestion || null);
  
        const isSubquestion = !!updatedGameState.game.rounds
  .find((round) => round.id === updatedGameState.currentRoundId)
  ?.questions.find((question) => question.id === updatedGameState.currentQuestionId)
  ?.subquestions?.length;

console.log("Is Subquestion:", isSubquestion);
  
        // Update the team status
        updateTeamStatus(updatedGameState, isSubquestion); 
        console.log('Updated Team Status:', JSON.stringify(teamStatus, null, 2));
       
      } catch (error: unknown) {
        console.error('Error handling answer submission:', error);
      }
    };    
  
    // WebSocket listener for subAnswersSubmitted
    const handleSubAnswersSubmitted = (data: {
      gameId: string;
      teamId: string;
      subAnswers: {
        subquestionId: string;
        answer: string;
      }[];
    }) => {
      if (data.gameId === gameId) {
        console.log("Subanswers submitted by team:", data.teamId);
    
        fetch(`/api/host/games/${gameId}/state`)
          .then((res) => {
            if (!res.ok) throw new Error("Failed to fetch updated game state");
            return res.json();
          })
          .then((updatedGameState: GameState) => {
            setGameState(updatedGameState);
            const currentRound = updatedGameState.game.rounds.find(
              (round) => round.id === updatedGameState.currentRoundId
            );
            
            const currentQuestion = currentRound?.questions.find(
              (question) => question.id === updatedGameState.currentQuestionId
            );

            if (currentQuestion) {
              // Attach subquestions to the current question
              currentQuestion.subquestions = currentQuestion.subquestions || [];
            }
            
            console.log("Determined Current Round:", currentRound);
            console.log("Determined Current Question:", currentQuestion);
            
            const isSubquestion = !!updatedGameState.game.rounds
              .find((round) => round.id === updatedGameState.currentRoundId)
              ?.questions.find((question) => question.id === updatedGameState.currentQuestionId)
              ?.subquestions?.length;

            console.log("Is Subquestion:", isSubquestion);
            updateTeamStatus(updatedGameState, isSubquestion);
          })
          .catch((err) => console.error("Error fetching updated game state:", err));
      }
    };
    


    const updateTeamStatus = (updatedGameState: GameState, isSubquestion: boolean) => {
      setTeamStatus(
        updatedGameState.game.teamGames.map((teamGame) => {
          const teamId = teamGame.team.id;
          const subAnswers = updatedGameState.subAnswersByTeam?.[teamId] || [];
          const singleAnswer = updatedGameState.answersByTeam?.[teamId] || null;
          
          return {
            id: teamId,
            name: teamGame.team.name,
            submitted: isSubquestion
              ? subAnswers.length > 0
              : !!singleAnswer,
            subAnswers: isSubquestion ? subAnswers : [],
            answer: isSubquestion ? null : singleAnswer?.answer || null,
            isCorrect: isSubquestion
              ? subAnswers.every((subAnswer) => subAnswer.isCorrect === true)
              : singleAnswer?.isCorrect ?? null,
            pointsUsed: singleAnswer?.pointsUsed ?? null,
          };
        })
      );
    };

    socket.on('host:answerSubmission', handleAnswerSubmission);
    socket.on("host:subAnswersSubmitted", handleSubAnswersSubmitted);     
  
    return () => {
      socket.off('host:answerSubmission', handleAnswerSubmission);
      socket.off("host:subAnswersSubmitted", handleSubAnswersSubmitted);
    };
  }, [gameId, teamStatus]); 
  

  useEffect(() => {
    setShowLastQuestionMessage(isLastQuestion);
  }, [isLastQuestion]);

  
  const handleNextQuestion = async () => {
    if (currentRoundIndex === null || currentQuestionIndex === null) {
      console.error("No current round or question index available.");
      return;
    }
  
    try {
      const response = await fetch(`/api/host/games/${gameId}/state`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPrevious: false, // Indicate this is moving forward
        }),
      });
  
      if (!response.ok) {
        throw new Error("Failed to update game state for the next question.");
      }
  
      const { gameState } = await response.json();
  
      setGameState(gameState);
  
      const updatedRound = rounds.find((round) => round.id === gameState.currentRoundId) || null;
      setCurrentRound(updatedRound);
  
      const updatedQuestion =
        updatedRound?.questions.find((q) => q.id === gameState.currentQuestionId) || null;
      
        if (updatedQuestion) {
          // Attach subquestions to the current question
          updatedQuestion.subquestions = updatedQuestion.subquestions || [];
        }
      
      setCurrentQuestion(updatedQuestion);
  
      const updatedQuestionIndex = updatedRound?.questions.findIndex(
        (q) => q.id === gameState.currentQuestionId
      );
      setCurrentQuestionIndex(updatedQuestionIndex ?? null);
      console.log("handleNextQuestion: just set the current question index " + updatedQuestionIndex);
  
      setIsLastQuestion(
        !!updatedRound?.questions &&
        updatedQuestionIndex !== undefined &&
        updatedQuestionIndex === updatedRound.questions.length - 1
      );
  
      // Reset the team status to "Pending"
      setTeamStatus((prevStatus) =>
        prevStatus.map((team) => ({
          ...team,
          submitted: false, // Reset to Pending
          answer: null, // Clear single answers
          subAnswers: [], // Clear subanswers
          isCorrect: null, // Reset correctness
          pointsUsed: null, // Clear points used
        }))
      );
  
      // Notify players about the updated question
      socket.emit("host:updateQuestion", {
        gameId,
        currentRoundId: gameState.currentRoundId,
        currentQuestionId: gameState.currentQuestionId,
      });
  
      console.log("Moved to the next question:", updatedQuestion);
    } catch (error) {
      console.error("Error moving to the next question:", error);
    }
  };
  
  
  
  const handlePreviousQuestion = async () => {
    if (currentRoundIndex === null || currentQuestionIndex === null) {
      console.error("No current round or question index available.");
      return;
    }
  
    try {
      // Send request to move to the previous question
      const response = await fetch(`/api/host/games/${gameId}/state`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPrevious: true, // Indicate this is moving backward
        }),
      });
  
      if (!response.ok) {
        throw new Error("Failed to update state for the previous question.");
      }
  
      const { gameState } = await response.json();
  
      // Update frontend state with backend response
      setGameState(gameState);
  
      const updatedRound = rounds.find((round) => round.id === gameState.currentRoundId) || null;
      setCurrentRound(updatedRound);
  
      const updatedQuestion =
        updatedRound?.questions.find((q) => q.id === gameState.currentQuestionId) || null;

        if (updatedQuestion) {
          // Attach subquestions to the current question
          updatedQuestion.subquestions = updatedQuestion.subquestions || [];
        }

      setCurrentQuestion(updatedQuestion);
  
      const updatedQuestionIndex = updatedRound?.questions.findIndex(
        (q) => q.id === gameState.currentQuestionId
      );
      setCurrentQuestionIndex(updatedQuestionIndex ?? null);
      console.log('handlePreviousQuestion: just set the current question index ' + updatedQuestionIndex);
      setIsLastQuestion(false); // Reset "isLastQuestion" when going backward
  
      // Notify players of the updated question
      socket.emit("host:updateQuestion", {
        gameId,
        currentRoundId: gameState.currentRoundId,
        currentQuestionId: gameState.currentQuestionId,
      });
  
      console.log("Moved to the previous question:", updatedQuestion);
    } catch (error) {
      console.error("Error moving to the previous question:", error);
    }
  };
  
  

  const handleScoreAnswer = async (teamId: string, isCorrect: boolean) => {
    if (!currentQuestion || !teamId) {
      console.error('Current question or team ID is missing.');
      return;
    }

    try {
      const response = await fetch(`/api/host/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          teamId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch answer for scoring');
      }

      const { answerId, pointsUsed } = await response.json();
      const pointsAwarded = isCorrect ? pointsUsed : 0;

      const updateResponse = await fetch(`/api/host/answers/${answerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isCorrect,
          pointsAwarded,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update answer score');
      }

      setTeamStatus((prevStatus) =>
        prevStatus.map((team) =>
          team.id === teamId ? { ...team, isCorrect } : team
        )
      );

      console.log("Answer for team ${teamId} scored as ${isCorrect ? 'correct' : 'incorrect'}.");
    } catch (error) {
      console.error('Error scoring answer:', error);
    }
  };


  const handleTakeABreak = async () => {
    try {
      setLoading(true);
  
      const response = await fetch(`/api/host/games/${gameId}/state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTransitioning: true }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to set the game to transition state.');
      }
  
      const updatedGameState = await response.json();
      setGameState(updatedGameState.gameState);
  
      // Notify players of the transition state
      socket.emit('host:transition', {
        gameId,
        isTransitioning: true,
        transitionMessage: 'The game is on a break. Please stay tuned!',
      });
  
      console.log('Game is now in transition.');
    } catch (error) {
      console.error('Error taking a break:', error);
    } finally {
      setLoading(false);
    }
  };
  

  const handleResumeGame = async () => {
    try {
      setLoading(true);
  
      const response = await fetch(`/api/host/games/${gameId}/state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTransitioning: false }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to resume the game.');
      }
  
      const updatedGameState = await response.json();
      setGameState(updatedGameState.gameState);
  
      // Notify players that the game has resumed
      socket.emit('host:resume', {
        gameId,
        currentRoundId: updatedGameState.gameState.currentRoundId,
        currentQuestionId: updatedGameState.gameState.currentQuestionId,
      });
  
      console.log('Game resumed successfully.');
    } catch (error) {
      console.error('Error resuming game:', error);
    } finally {
      setLoading(false);
    }
  };  
  

  const handleToggleScores = async (visible: boolean) => {
    try {
      const response = await fetch(`/api/host/games/${gameId}/scores-visibility`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scoresVisibleToPlayers: visible }),
      });
  
      if (!response.ok) throw new Error('Failed to update scores visibility');
  
      const updatedState = await response.json();
  
      // Emit WebSocket event
      console.log("emitting signal the score toggle occurred.");
      socket.emit('host:toggleScores', { gameId, scoresVisibleToPlayers: visible });
  
      console.log('Scores visibility updated:', updatedState.scoresVisibleToPlayers);
    } catch (error) {
      console.error('Error toggling scores visibility:', error);
    }
  };

  const handleScoreSubAnswer = async (
    teamId: string,
    subquestionId: string,
    isCorrect: boolean
  ) => {
    if (!teamId || !subquestionId) {
      console.error('Team ID or Subquestion ID is missing.');
      return;
    }
  
    try {
      // Get the point value from the current round
      const pointsAwarded = isCorrect
        ? currentRound?.pointValue ?? 0 // Use pointValue from the round, default to 0
        : 0;
  
      // Update the subanswer in the database
      const updateResponse = await fetch(`/api/host/subanswers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          subquestionId,
          isCorrect,
          pointsAwarded,
        }),
      });
  
      if (!updateResponse.ok) {
        throw new Error('Failed to update subanswer score');
      }  
      
  
      // Update the team status in the UI
      setTeamStatus((prevStatus) =>
        prevStatus.map((team) =>
          team.id === teamId
            ? {
                ...team,
                subAnswers: team.subAnswers?.map((subAnswer) =>
                  subAnswer.subquestionId === subquestionId
                    ? { ...subAnswer, isCorrect, pointsAwarded }
                    : subAnswer
                ),
              }
            : team
        )
      );
  
      console.log(
        `Subanswer for team ${teamId}, subquestion ${subquestionId}, scored as ${
          isCorrect ? 'correct' : 'incorrect'
        } with ${pointsAwarded} points.`
      );
    } catch (error) {
      console.error('Error scoring subanswer:', error);
    }
  };
  
  

  // const handleEndGame = async () => {
  //   setLoading(true);
  //   try {
  //     // Update game status to COMPLETED
  //     await fetch(`/api/host/games/${gameId}`, {
  //       method: 'PUT',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ status: 'COMPLETED' }),
  //     });
  
  //     // Notify all clients to return to dashboard
  //     socket.emit('host:gameCompleted', { gameId });
  
  //     // Redirect host to dashboard
  //     router.push('/dashboard/host');
  //   } catch (error) {
  //     console.error('Error completing game:', error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  
  
  

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Game Interface</h1>

      <div className="mb-6">
        <h2 className="text-xl">Current Round: {currentRound?.name || 'No current round'}</h2>
        <h3 className="text-lg">
          Current Question: {currentQuestion?.text || 'No current question'}
        </h3>
      </div>

      <div className="mb-6">
  <h3 className="text-lg font-semibold">Team Status:</h3>
  <ul>
    {teamStatus.map((team) => (      
      <li key={team.id} className="mb-4 p-4 bg-gray-100 rounded-lg">
        {/* Team Name and Submission Status */}
        <h4 className="text-lg font-semibold">
          {team.name}: {team.submitted ? "Submitted" : "Pending"}
        </h4>

        {/* If the team has submitted answers */}
       
        {team.submitted && (
          <div className="mt-2">
            {/* Check if there are subquestions */}          
            {(currentQuestion?.subquestions?.length ?? 0) > 0 ? (
              // Render Subquestions
              <div>
                <h5 className="text-sm font-semibold">Subanswers:</h5>
                <ul>
                  {currentQuestion?.subquestions?.map((subquestion) => {
                    const subAnswer = team.subAnswers?.find(
                      (sub) => sub.subquestionId === subquestion.id
                    );

                    return (
                      <li key={subquestion.id} className="mt-2">
                        <p className="text-sm">
                          <strong>{subquestion.text}:</strong>{" "}
                          {subAnswer?.answer || "No answer submitted"}
                        </p>
                        {subAnswer && (
                          <div className="mt-2">
                            {subAnswer.isCorrect === null ? (
                              // Scoring Buttons for Subquestions
                              <div>
                                <button
                                  onClick={() =>
                                    handleScoreSubAnswer(
                                      team.id,
                                      subAnswer.subquestionId,
                                      true
                                    )
                                  }
                                  className="bg-green-500 text-white px-4 py-1 rounded hover:bg-green-600 mr-2"
                                >
                                  Correct
                                </button>
                                <button
                                  onClick={() =>
                                    handleScoreSubAnswer(
                                      team.id,
                                      subAnswer.subquestionId,
                                      false
                                    )
                                  }
                                  className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600"
                                >
                                  Incorrect
                                </button>
                              </div>
                            ) : (
                              <p
                                className={`mt-2 text-sm font-semibold ${
                                  subAnswer.isCorrect
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                Marked as:{" "}
                                {subAnswer.isCorrect ? "Correct" : "Incorrect"}
                              </p>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              // Render Single Answer
              <div>
                <p className="text-sm">
                  <strong>Answer:</strong> {team.answer || "No answer submitted"}
                </p>
                {currentRound?.pointSystem === "POOL" && (
                  <p className="text-sm">
                    <strong>Points Used:</strong>{" "}
                    {team.pointsUsed ?? "No points submitted"}
                  </p>
                )}
                <div className="mt-2">
                  {team.isCorrect === null ? (
                    // Scoring Buttons for Single Answer
                    <div>
                      <button
                        onClick={() => handleScoreAnswer(team.id, true)}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 mr-2"
                      >
                        Correct
                      </button>
                      <button
                        onClick={() => handleScoreAnswer(team.id, false)}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                      >
                        Incorrect
                      </button>
                    </div>
                  ) : (
                    <p
                      className={`mt-2 text-lg font-semibold ${
                        team.isCorrect ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      Marked as: {team.isCorrect ? "Correct" : "Incorrect"}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </li>
    ))}
  </ul>
</div>




<div className="navigation-buttons">
  {gameState?.isTransitioning ? (
    // Show "Resume Game" button if the game is in transition
    <button
      onClick={handleResumeGame}
      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
    >
      Resume Game
    </button>
  ) : (
    <div className="flex space-x-4">
      {currentQuestionIndex !== null && currentQuestionIndex > 0 && (
        <button
          onClick={handlePreviousQuestion}
          className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
        >
          Previous Question
        </button>
      )}
      <button
        onClick={handleNextQuestion}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
      >
        Next Question
      </button>
    </div>
  )}
</div>

{isLastQuestion && showLastQuestionMessage && (
  <div className="p-4 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-800 mb-6">
    <p className="text-lg font-semibold">
      You have reached the last question of this round!
    </p>
    <p>
      Once you have scored all teams, you may want to take a break before moving to the next round.
    </p>
    <div className="mt-4">
      <button
        onClick={handleTakeABreak}
        className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 mr-2"
      >
        Take a Break
      </button>
      <button
        onClick={() => setShowLastQuestionMessage(false)}
        className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400"
      >
        Dismiss
      </button>
    </div>
  </div>
)}



      <div>            
          <button
            onClick={() => handleToggleScores(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Show Scores
          </button>
          
          <button
            onClick={() => handleToggleScores(false)}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
          >
            Hide Scores
          </button>
        </div>
    </div>
  );
}
