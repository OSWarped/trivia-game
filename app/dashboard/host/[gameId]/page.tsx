'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation'; // Correct import for Next.js 15+

interface HostingSite {
  id: string;
  name: string;
  location: string;
}

interface Game {
  id: string;
  name: string;
  date: string;
  hostingSite: HostingSite;
  hostId: string;
  host: {
    name: string;
  };
}

interface Round {
  id: string;
  name: string;
  roundType: string;
}

export default function GameSetup() {
  const { gameId } = useParams(); // Get the gameId from the URL params
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!gameId) return; // Don't run if the gameId is not yet available

    const fetchGameData = async () => {
      try {
        // Fetch game data
        const gameRes = await fetch(`/api/host/games/${gameId}`);
        const gameData = await gameRes.json();

        // Check if the game data is valid
        if (gameData.error) {
          setError(gameData.error);
          return;
        }

        setGame(gameData); // Game data

        // Fetch rounds for the game
        const roundsRes = await fetch(`/api/host/games/${gameId}/rounds`);
        const roundsData = await roundsRes.json();
        setRounds(roundsData); // Set rounds data
      } catch (err) {
        console.error('Error fetching game or rounds:', err);
        setError('Something went wrong while fetching game data.');
      }
    };

    fetchGameData();
  }, [gameId]); // The useEffect hook will run whenever gameId changes

  const handleAddRound = () => {
    router.push(`/dashboard/host/${gameId}/add-round`); // Redirect to the "Add Round" page
  };

  if (error) {
    return <div className="text-red-600">{error}</div>; // Softer error color
  }

  if (!game) {
    return <div>Loading...</div>;
  }

  const handleRoundClick = (roundId: string) => {
    router.push(`/dashboard/host/${gameId}/rounds/${roundId}`); // Redirect to round details page
  };

  // Ensure the date is properly displayed as MM/DD/YYYY, adjusting for timezone
  const formattedDate = new Date(game.date).toLocaleDateString('en-US', {
    timeZone: 'UTC', // Make sure we display the date correctly
  });

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h1 className="text-3xl font-semibold text-center mb-8">Game Setup for {game.name}</h1>

      <p className="text-lg">
        Date: {formattedDate} {/* Display date in MM/DD/YYYY */}
      </p>
      <p className="text-lg">Hosting Site: {game.hostingSite.name}</p>

      <h2 className="text-2xl mt-8">Rounds</h2>
      {rounds.length === 0 ? (
        <div>
          <p>No rounds have been created yet.</p>
        </div>
      ) : (
        <ul className="space-y-4 mt-4">
          {rounds.map((round) => (
            <li key={round.id} className="my-4 bg-gray-100 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold">{round.name}</h3>
                  <p className="text-sm text-gray-600">{round.roundType}</p> {/* Round type below the name */}
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={() => handleRoundClick(round.id)} // Make this button clickable to navigate
                    className="text-blue-500 hover:text-blue-600"
                  >
                    View Round Details
                  </button>
                  <button
                    onClick={() => router.push(`/dashboard/host/${gameId}/rounds/${round.id}/questions`)} // View/Edit/Add/Delete Questions
                    className="text-blue-500 hover:text-blue-600"
                  >
                    View/Edit/Add/Delete Questions
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Always show the Add Round button */}
      <div className="mt-6">
        <button
          onClick={handleAddRound}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add Round
        </button>
      </div>
    </div>
  );
}
