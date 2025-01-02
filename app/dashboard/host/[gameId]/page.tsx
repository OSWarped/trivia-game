'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Game {
  id: string;
  name: string;
  date: string;
  hostingSite: {
    name: string;
    id: string;
  };
  hostGames: {
    host: {
      name: string;
      id: string;
    };
  }[];
}

export default function EditGamePage() {
  const { gameId } = useParams(); // Unwrap gameId from params
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [hostId, setHostId] = useState<string>('');
  const [gameName, setGameName] = useState<string>('');
  const [gameDate, setGameDate] = useState<string>('');
  const [hostingSiteId, setHostingSiteId] = useState<string>('');

  useEffect(() => {
    // Fetch game data on page load
    const fetchGame = async () => {
      if (!gameId) return; // Don't fetch if there's no gameId

      try {
        const response = await fetch(`/api/host/games/${gameId}`);
        const data = await response.json();
        if (response.ok) {
          setGame(data);
          setGameName(data.name);
          setGameDate(data.date);
          setHostingSiteId(data.hostingSite.id);
          setHostId(data.hostGames[0]?.host.id || ''); // Use first host
        } else {
          setError('Failed to fetch game details');
        }
      } catch (err) {
        console.error(err);
        setError('Error fetching game details');
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [gameId]); // Watch gameId in dependency array

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const updatedGame = {
      name: gameName,
      date: gameDate,
      hostingSiteId,
      hostId,
    };

    try {
      const response = await fetch(`/api/host/games/${gameId}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedGame),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Game updated successfully');
        // Optionally redirect to another page after successful update
      } else {
        setError(data.error || 'Failed to update game');
      }
    } catch (err) {
      console.error(err);
      setError('Error updating game');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Edit Game: {game?.name}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-lg font-medium mb-2" htmlFor="name">
            Game Name
          </label>
          <input
            type="text"
            id="name"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>

        <div>
  <label className="block text-lg font-medium mb-2" htmlFor="date">
    Game Date
  </label>
  <input
    type="date"
    id="date"
    value={gameDate ? new Date(gameDate).toISOString().split('T')[0] : ''} // Format the date to yyyy-MM-dd
    onChange={(e) => setGameDate(e.target.value)}
    className="w-full p-2 border border-gray-300 rounded"
  />
</div>


        <div>
          <label className="block text-lg font-medium mb-2" htmlFor="hostingSite">
            Hosting Site
          </label>
          <select
            id="hostingSite"
            value={hostingSiteId}
            onChange={(e) => setHostingSiteId(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          >
            <option value="">Select a hosting site</option>
            <option value={game?.hostingSite.id}>{game?.hostingSite.name}</option>
          </select>
        </div>

        <div>
          <label className="block text-lg font-medium mb-2" htmlFor="host">
            Host
          </label>
          <select
            id="host"
            value={hostId}
            onChange={(e) => setHostId(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          >
            <option value="">Select a host</option>
            {game?.hostGames.map((hostGame) => (
              <option key={hostGame.host.id} value={hostGame.host.id}>
                {hostGame.host.name}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">
          Save Changes
        </button>
      </form>
    </div>
  );
}
