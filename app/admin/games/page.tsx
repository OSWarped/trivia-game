'use client';

import { Round } from '@prisma/client';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface HostingSite {
  id: string;
  name: string;
  location: string;
}

interface Team {
  id: string;
  name: string;
  captainId: string;
  gameId: string;
  score: number;
}

interface Game {
  id: string;
  title: string;
  date: string;
  hostingSiteId: string;
  hostingSite: HostingSite | null;
  hostId: string; // Directly store hostId in the Game model
  teams: Team[];
  rounds: Round[];
}

interface User {
  id: string;
  name: string;
  role: string;
}

export default function ManageGames() {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [hostingSites, setHostingSites] = useState<HostingSite[]>([]);
  const [hosts, setHosts] = useState<User[]>([]);
  const [editGame, setEditGame] = useState<Game | null>(null);
  const [newGame, setNewGame] = useState({ title: '', date: '', hostingSiteId: '', hostId: '' });
  const [showModal, setShowModal] = useState(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch games
  const fetchGames = async () => {
    try {
      const res = await fetch('/api/admin/games');
      const data = await res.json();
      setGames(data);
    } catch (err) {
      console.error('Error fetching games:', err);
      setError('Failed to fetch games');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch the initial data when the component mounts
    async function fetchHostingSites() {
      try {
        const res = await fetch('/api/admin/sites');
        const data = await res.json();
        setHostingSites(data);
      } catch (err) {
        console.error('Error fetching hosting sites:', err);
      }
    }

    async function fetchHosts() {
      try {
        const res = await fetch('/api/admin/users');
        const data = await res.json();
        const hosts = data.filter((user: User) => (user.role =='HOST' || user.role == 'ADMIN'));
        setHosts(hosts);
      } catch (err) {
        console.error('Error fetching hosts:', err);
      }
    }

    fetchGames();
    fetchHostingSites();
    fetchHosts();
  }, []);

  // Save or update game
  const handleSaveGame = async () => {
    const endpoint = editGame ? `/api/admin/games/${editGame.id}` : '/api/admin/games';
    const method = editGame ? 'PUT' : 'POST';

    const body = editGame
      ? { ...editGame, hostId: editGame.hostId }
      : { ...newGame, hostId: newGame.hostId };

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const updatedGame = await res.json();
        // Update the game list
        setGames((prevGames) =>
          prevGames.map((game) => (game.id === updatedGame.id ? updatedGame : game))
        );
        setEditGame(null);
        setNewGame({ title: '', date: '', hostingSiteId: '', hostId: '' });
        setShowModal(false);
        fetchGames(); // Re-fetch the games list after saving
      } else {
        alert('Failed to save game');
      }
    } catch (err) {
      console.error('Error saving game:', err);
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    try {
      const res = await fetch(`/api/admin/games/${gameId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setGames((prevGames) => prevGames.filter((game) => game.id !== gameId));
      } else {
        alert('Failed to delete game');
      }
    } catch (err) {
      console.error('Error deleting game:', err);
    }
  };

  const handleEditGame = (game: Game) => {
    setEditGame(game);
    setNewGame({
      title: game.title,
      date: game.date,
      hostingSiteId: game.hostingSiteId,
      hostId: game.hostId, // Directly use hostId
    });
    setShowModal(true);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
    <button
        onClick={() => router.push('/admin/dashboard')}
        className="mb-4 flex items-center text-blue-600 hover:underline"
      >
        <ChevronLeft className="mr-1" size={18} />
        Back to Admin Panel
      </button>
      <h1 className="text-2xl font-bold mb-6">Manage Games</h1>
      <button
        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mb-4"
        onClick={() => {
          setShowModal(true);
          setEditGame(null);
          setNewGame({ title: '', date: '', hostingSiteId: '', hostId: '' });
        }}
      >
        Add New Game
      </button>
      <ul className="space-y-4">
  {games.map((game) => {
    const host = hosts.find((host) => host.id === game.hostId); // Find the host by hostId
    return (
      <li key={game.id} className="flex justify-between items-center bg-white p-4 rounded shadow-md">
        <div>
          <h2 className="text-lg font-semibold">{game.title}</h2>
          <p className="text-sm text-gray-600">
            Date: {new Date(game.date).toLocaleDateString('en-US')}
          </p>
          <p className="text-sm text-gray-600">
            Hosting Site: {game.hostingSite ? game.hostingSite.name : 'No hosting site assigned'}
          </p>
          <p className="text-sm text-gray-600">
            Host: {host ? host.name : 'No host assigned'} {/* Display the host's name */}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
            onClick={() => handleEditGame(game)}
          >
            Edit
          </button>
          <button
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            onClick={() => handleDeleteGame(game.id)}
          >
            Delete
          </button>
        </div>
      </li>
    );
  })}
</ul>


      {/* Modal to Add/Edit Game */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-md w-1/2">
            <h2 className="text-xl font-bold mb-4">{editGame ? 'Edit Game' : 'Add Game'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block font-medium mb-1">Name</label>
                <input
                  className="border border-gray-300 p-2 rounded w-full"
                  value={editGame ? editGame.title : newGame.title}
                  onChange={(e) =>
                    editGame
                      ? setEditGame({ ...editGame, title: e.target.value })
                      : setNewGame({ ...newGame, title: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Date</label>
                <input
                  type="date"
                  className="border border-gray-300 p-2 rounded w-full"
                  value={editGame ? editGame.date.substring(0, 10) : newGame.date.substring(0, 10)}
                  onChange={(e) =>
                    editGame
                      ? setEditGame({ ...editGame, date: e.target.value })
                      : setNewGame({ ...newGame, date: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Hosting Site</label>
                <select
                  className="border border-gray-300 p-2 rounded w-full"
                  value={editGame ? editGame.hostingSiteId : newGame.hostingSiteId}
                  onChange={(e) =>
                    editGame
                      ? setEditGame({ ...editGame, hostingSiteId: e.target.value })
                      : setNewGame({ ...newGame, hostingSiteId: e.target.value })
                  }
                >
                  <option value="">Select a hosting site</option>
                  {hostingSites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Assign Host</label>
                <select
                  className="border border-gray-300 p-2 rounded w-full"
                  value={editGame ? editGame.hostId : newGame.hostId}
                  onChange={(e) =>
                    editGame
                      ? setEditGame({ ...editGame, hostId: e.target.value })
                      : setNewGame({ ...newGame, hostId: e.target.value })
                  }
                >
                  <option value="">Select a host</option>
                  {hosts.map((host) => (
                    <option key={host.id} value={host.id}>
                      {host.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-4 mt-4">
              <button
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                onClick={handleSaveGame}
              >
                Save
              </button>
              <button
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
