'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io } from 'socket.io-client';

const websocketURL = process.env.NEXT_PUBLIC_WEBSOCKET_URL

console.log("connection to " + websocketURL);
//const socket = io(websocketURL); // WebSocket server URL
const socket = io('http://192.168.1.75:3009');
//const socket = io('http://104.56.124.234:3009');



interface Round {
  id: string;
  name: string;
  questions: Question[];
  pointSystem: 'POOL' | 'FLAT'; // Add this property
}


interface Question {
  id: string;
  text: string;
}

interface TeamStatus {
  id: string;
  name: string;
  submitted: boolean;
  answer?: string | null;
  pointsUsed?: number | null;
  isCorrect?: boolean | null;
}

interface GameState {
  currentRoundId: string | null;
  currentQuestionId: string | null;
  isTransitioning?: boolean;
}

export default function HostGameInterface() {
  const { gameId } = useParams();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number | null>(null);
  const [isLastQuestion, setIsLastQuestion] = useState(false);
  const [teamStatus, setTeamStatus] = useState<TeamStatus[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const isLastRound = currentRound?.id === rounds[rounds.length - 1]?.id;


  // Fetch game state
  useEffect(() => {
    const fetchGameState = async () => {
      try {
        const res = await fetch(`/api/games/${gameId}/state`);
        if (!res.ok) throw new Error('Failed to fetch game state');
        const data = await res.json();

        setGameState({
          currentRoundId: data.game.currentRound?.id || null,
          currentQuestionId: data.game.currentQuestion?.id || null,
          isTransitioning: data.game.isTransitioning || false,
        });
      } catch (err) {
        console.error('Error fetching game state:', err);
        setError('Failed to load game state.');
      }
    };

    fetchGameState();
  }, [gameId]);

  // Fetch rounds and sync current round/question
  useEffect(() => {
    const fetchRounds = async () => {
      try {
        const res = await fetch(`/api/host/games/${gameId}/rounds`);
        if (!res.ok) throw new Error('Failed to fetch rounds');
        const data = await res.json();
        setRounds(data);

        if (gameState?.currentRoundId) {
          const round = data.find((r: Round) => r.id === gameState.currentRoundId);
          if (round) {
            setCurrentRound(round);

            if (gameState.currentQuestionId) {
              const questionIndex = round.questions.findIndex(
                (q: Question) => q.id === gameState.currentQuestionId
              );
              if (questionIndex !== -1) {
                setCurrentQuestion(round.questions[questionIndex]);
                setCurrentQuestionIndex(questionIndex);
                setIsLastQuestion(questionIndex === round.questions.length - 1);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching rounds:', err);
        setError('Failed to load rounds.');
      }
    };

    if (gameState) fetchRounds();
  }, [gameId, gameState]);

  // Fetch teams and sync submissions
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await fetch(`/api/host/games/${gameId}/teams`);
        if (!res.ok) throw new Error('Failed to fetch teams');
        const teams = await res.json();
        setTeamStatus(
          teams.map((team: { id: string; name: string }) => ({
            id: team.id,
            name: team.name,
            submitted: false,
          }))
        );
      } catch (err) {
        console.error('Error fetching teams:', err);
        setError('Failed to load teams.');
      }
    };

    fetchTeams();

    // Listen for team answer submissions
    socket.on('host:answerSubmission', (data) => {
      setTeamStatus((prevStatus) =>
        prevStatus.map((team) =>
          team.id === data.teamId
            ? {
                ...team,
                submitted: true,
                answer: data.answer,
                pointsUsed: data.pointsUsed,
                isCorrect: null,
              }
            : team
        )
      );
    });

    return () => {
      socket.off('host:answerSubmission');
    };
  }, [gameId]);

  const handleNextQuestion = async () => {
    console.log('Starting Next Question Process\nCurrent Question Index: :' + currentQuestionIndex);
    if (!currentRound || currentQuestionIndex === null) {
      console.error('No current round or question index available.');
      return;
    }
  
    const nextQuestionIndex = currentQuestionIndex + 1;
    console.log('Next Question index: ' + nextQuestionIndex);
    // Check if there are more questions in the current round
    if (nextQuestionIndex < currentRound.questions.length) {
      const nextQuestion = currentRound.questions[nextQuestionIndex];
  
      try {
        // Update the game state for the next question
        const response = await fetch(`/api/games/${gameId}/state`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentRoundId: currentRound.id,
            currentQuestionId: nextQuestion.id,
          }),
        });
  
        if (!response.ok) {
          throw new Error('Failed to update game state');
        }
  
        // Update the state to reflect the next question
        setCurrentQuestion(nextQuestion);
        setCurrentQuestionIndex(nextQuestionIndex);
  
        // Check if the next question is the last one in the round
        setIsLastQuestion(nextQuestionIndex === currentRound.questions.length - 1);
  
        // Emit the updated question to clients
        socket.emit('host:updateQuestion', {
          gameId,
          currentRoundId: currentRound.id,
          currentQuestionId: nextQuestion.id,
          question: nextQuestion,
        });
  
        console.log('Moved to next question:', nextQuestion);
      } catch (error) {
        console.error('Error moving to the next question:', error);
      }
    } else {
      console.log('No more questions in this round.');
      // If there are no more questions, prepare for transition
      handleTransitionToNextRound();
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

  const handleTransitionToNextRound = async () => {
    if (!currentRound) return;
  
    setLoading(true);
    try {
      const response = await fetch(`/api/games/${gameId}/state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isTransitioning: true,
          currentRoundId: null,
          currentQuestionId: null,
        }),
      });
  
      if (!response.ok) throw new Error('Failed to update state for transition');
  
      const updatedState = await response.json();
  
      // Update game state with the backend response
      setGameState(updatedState.gameState);
  
      // Emit socket event to notify other clients
      socket.emit('host:transition', { gameId, isTransitioning: true });
    } catch (error) {
      console.error('Error during transition:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResumeGame = async () => {
    setLoading(true);
    try {
      // Fetch all rounds to determine the next round
      const roundsResponse = await fetch(`/api/host/games/${gameId}/rounds`);
      if (!roundsResponse.ok) throw new Error('Failed to fetch rounds');
      const rounds = await roundsResponse.json();
  
      // Find the next round based on the current round
      const currentRoundIndex = rounds.findIndex((r:Round) => r.id === currentRound?.id);
      const nextRound = rounds[currentRoundIndex + 1];
  
      if (!nextRound) {
        console.error('No more rounds available');
        setLoading(false);
        return;
      }
  
      const nextQuestion = nextRound.questions[0];
  
      const response = await fetch(`/api/games/${gameId}/state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isTransitioning: false,
          currentRoundId: nextRound.id,
          currentQuestionId: nextQuestion.id,
        }),
      });
  
      if (!response.ok) throw new Error('Failed to resume game');
  
      socket.emit('host:resume', { gameId });
  
      setGameState((prev) => ({
        ...prev,
        isTransitioning: false,
        currentRoundId: nextRound.id,
        currentQuestionId: nextQuestion.id,
      }));
  
      console.log('Game resumed to next round:', nextRound.name);
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

  const handleEndGame = async () => {
    setLoading(true);
    try {
      // Update game status to COMPLETED
      await fetch(`/api/host/games/${gameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
  
      // Notify all clients to return to dashboard
      socket.emit('host:gameCompleted', { gameId });
  
      // Redirect host to dashboard
      router.push('/dashboard/host');
    } catch (error) {
      console.error('Error completing game:', error);
    } finally {
      setLoading(false);
    }
  };
  
  
  

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
        <h4 className="text-lg font-semibold">
          {team.name}: {team.submitted ? 'Submitted' : 'Pending'}
        </h4>
        {team.submitted && (
          <div className="mt-2">
            <p className="text-sm">Answer: {team.answer || 'No answer submitted'}</p>
            {currentRound?.pointSystem === 'POOL' && (
              <p className="text-sm">Points Used: {team.pointsUsed ?? 'No points submitted'}</p>
            )}
            <div className="mt-2">
              {team.isCorrect === null ? (
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
                    team.isCorrect ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  Marked as: {team.isCorrect ? 'Correct' : 'Incorrect'}
                </p>
              )}
            </div>
            
          </div>
        )}
      </li>
    ))}
  </ul>
</div>


{gameState?.isTransitioning ? (
  <button
    onClick={handleResumeGame}
    className={`bg-green-500 text-white px-4 py-2 rounded-lg ${
      loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-600'
    }`}
    disabled={loading}
  >
    {loading ? 'Resuming...' : 'Resume Game'}
  </button>
) : isLastQuestion && isLastRound ? (
  <button
    onClick={handleEndGame}
    className={`bg-red-500 text-white px-4 py-2 rounded-lg ${
      loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600'
    }`}
    disabled={loading}
  >
    {loading ? 'Ending Game...' : 'End Game'}
  </button>
) : isLastQuestion ? (
  <button
    onClick={handleTransitionToNextRound}
    className={`bg-orange-500 text-white px-4 py-2 rounded-lg ${
      loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-orange-600'
    }`}
    disabled={loading}
  >
    {loading ? 'Transitioning...' : 'Transition to Next Round'}
  </button>
) : (
  <button
    onClick={handleNextQuestion}
    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
  >
    Next Question
  </button>
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
