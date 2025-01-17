'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface HostingSite {
  id: string;
  name: string;
  location: string;
}

interface Team {
  id: string;
  name: string;
}

interface Game {
  id: string;
  name: string;
  date: string;
  status: 'COMPLETED' | 'PENDING' | 'IN_PROGRESS';
  hostingSite: HostingSite;
  teams: Team[]; // Add teams participating in the game
  isTransitioning: boolean; // Indicates if the game is in transition
  transitionMessage?: string; // Message for the transition state
}

export default function HostDashboard() {
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [filter, setFilter] = useState<string>('all'); // Filter for game status
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Fetch games for the host
    fetch('/api/host/games', {
      method: 'GET',
      credentials: 'same-origin',
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setGames(data);
          setFilteredGames(data); // Initially display all games
        }
      })
      .catch((error) => {
        console.error('Error fetching games:', error);
        setError('Something went wrong while fetching the games.');
      })
      .finally(() => setLoading(false));
  }, []);

  // Filter games based on selected status
  useEffect(() => {
    if (filter === 'all') {
      setFilteredGames(games);
    } else {
      setFilteredGames(games.filter((game) => game.status === filter));
    }
  }, [filter, games]);

  

  const formatDateUTC = (dateString: string): string => {
    const date = new Date(dateString); // Parse the UTC date string
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0'); // Months are 0-based
    const day = date.getUTCDate().toString().padStart(2, '0'); // Use UTC day
    const year = date.getUTCFullYear();
    return `${month}/${day}/${year}`;
  };

  if (loading) {
    return <p className="text-center text-gray-500">Loading games...</p>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h1 className="text-3xl font-semibold text-center mb-8">Host Dashboard</h1>
      {error && <p className="text-red-500 text-center">{error}</p>}

      {/* Filters */}
      <div className="mb-6 flex justify-center gap-4">
        <button
          className={`px-4 py-2 rounded-lg ${
            filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${
            filter === 'PENDING' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
          onClick={() => setFilter('PENDING')}
        >
          Pending
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${
            filter === 'IN_PROGRESS' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
          onClick={() => setFilter('IN_PROGRESS')}
        >
          In Progress
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${
            filter === 'COMPLETED' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
          onClick={() => setFilter('COMPLETED')}
        >
          Completed
        </button>
      </div>

      {/* Games List */}
      {filteredGames.length === 0 ? (
        <p className="text-center text-gray-500">No games found.</p>
      ) : (
        <ul className="space-y-6">
          {filteredGames.map((game) => (
            <li key={game.id} className="p-4 bg-gray-50 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-800">{game.name}</h2>
              <p className="text-gray-600">Date: {formatDateUTC(game.date)}</p>
              <p className="text-gray-600">Hosting Site: {game.hostingSite.name}</p>
              <p className="text-gray-600">Status: {game.status}</p>
              <p className="text-gray-600">
                Teams: {game.teams.length} participating
              </p>
              {game.isTransitioning && (
                <p className="text-gray-600 font-bold">In Transition: {game.transitionMessage}</p>
              )}

              {/* Action Buttons */}
              <div className="mt-4 flex gap-4">
                {game.status === 'PENDING' && (
                  <button
                    className="px-4 py-2 bg-green-500 text-white rounded-lg shadow hover:bg-green-600"
                  >
                    Start Game
                  </button>
                )}
                {game.status === 'IN_PROGRESS' && (
                  <button
                    className="px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600"
                  >
                    Complete Game
                  </button>
                )}
                <Link
                  href={`/dashboard/host/${game.id}`}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600"
                >
                  Edit Game
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
