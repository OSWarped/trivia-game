'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
  host: {
    name: string; // Now including the host name
  };
}

export default function HostDashboard() {
  const [games, setGames] = useState<Game[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    console.log("host dashboard attempting to get token from cookies");

    // Use 'credentials: same-origin' to send cookies automatically
    fetch('/api/host/games', {
      method: 'GET',
      credentials: 'same-origin', // Ensure cookies are sent with the request
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setGames(data);
        }
      })
      .catch((error) => {
        console.error('Error fetching games:', error);
        setError('Something went wrong while fetching the games.');
      });
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h1 className="text-3xl font-semibold text-center mb-8">Host Dashboard</h1>
      {error && <p className="text-red-500 text-center">{error}</p>}

      {games.length === 0 ? (
        <p className="text-center text-gray-500">No games found.</p>
      ) : (
        <ul className="space-y-6">
          {games.map((game) => (
            <li key={game.id}>
              <Link
                href={`/dashboard/host/${game.id}`} // Use game.id to link to the dynamic page
                className="block bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <h2 className="text-xl font-semibold text-gray-800">{game.name}</h2>
                <p className="text-gray-600">Date: {new Date(game.date).toLocaleString()}</p>
                <p className="text-gray-600">Hosting Site: {game.hostingSite.name}</p>
                <p className="text-gray-600">Host: {game.host.name}</p> {/* Display the host's name */}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
