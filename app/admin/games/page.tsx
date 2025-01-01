'use client';

import { useState, useEffect } from 'react';

interface Game {
  id: string;
  name: string;
  date: string;
  hostingSiteId: string;
  hostingSiteName: string;
}

interface HostingSite {
  id: string;
  name: string;
}

export default function ManageGames() {
  const [games, setGames] = useState<Game[]>([]);
  const [hostingSites, setHostingSites] = useState<HostingSite[]>([]);
  const [editGame, setEditGame] = useState<Game | null>(null);
  const [newGame, setNewGame] = useState({ name: '', date: '', hostingSiteId: '' });

  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    async function fetchGames() {
      try {
        const res = await fetch('/api/admin/games');
        const data = await res.json();
        setGames(data);
      } catch (err) {
        console.error('Error fetching games:', err);
      }
    }

    async function fetchHostingSites() {
      try {
        const res = await fetch('/api/admin/sites');
        const data = await res.json();
        setHostingSites(data);
      } catch (err) {
        console.error('Error fetching hosting sites:', err);
      }
    }

    fetchGames();
    fetchHostingSites();
  }, []);

  async function handleSaveGame() {
    const endpoint = editGame ? `/api/admin/games/${editGame.id}` : '/api/admin/games';
    const method = editGame ? 'PUT' : 'POST';
    const body = editGame
  ? { 
      name: editGame.name, 
      date: new Date(editGame.date).toISOString(), 
      hostingSiteId: editGame.hostingSiteId 
    }
  : { 
      ...newGame, 
      date: new Date(newGame.date).toISOString() 
    };

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const updatedGame = await res.json();

        if (editGame) {
          setGames((prevGames) =>
            prevGames.map((game) => (game.id === updatedGame.id ? updatedGame : game))
          );
        } else {
          setGames((prevGames) => [...prevGames, updatedGame]);
        }

        setEditGame(null);
        setNewGame({ name: '', date: '', hostingSiteId: '' });
        setShowModal(false);
      } else {
        alert('Failed to save game');
      }
    } catch (err) {
      console.error('Error saving game:', err);
    }
  }

  async function handleDeleteGame(gameId: string) {
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
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Manage Games</h1>
      <button
        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mb-4"
        onClick={() => {
          setShowModal(true);
          setEditGame(null);
          setNewGame({ name: '', date: '', hostingSiteId: '' });
        }}
      >
        Add New Game
      </button>
      <ul className="space-y-4">
        {games.map((game) => (
          <li
            key={game.id}
            className="flex justify-between items-center bg-white p-4 rounded shadow-md"
          >
            <div>
              <h2 className="text-lg font-semibold">{game.name}</h2>
              <p className="text-sm text-gray-600">
  Date: {new Date(game.date).toLocaleDateString('en-US', { timeZone: 'UTC' })}
</p>


              <p className="text-sm text-gray-600">Site: {game.hostingSiteName}</p>
            </div>
            <div className="flex space-x-2">
              <button
                className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                onClick={() => {
                  setEditGame(game);
                  setShowModal(true);
                }}
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
        ))}
      </ul>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-md w-1/2">
            <h2 className="text-xl font-bold mb-4">{editGame ? 'Edit Game' : 'Add Game'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block font-medium mb-1">Name</label>
                <input
                  className="border border-gray-300 p-2 rounded w-full"
                  value={editGame ? editGame.name : newGame.name}
                  onChange={(e) =>
                    editGame
                      ? setEditGame({ ...editGame, name: e.target.value })
                      : setNewGame({ ...newGame, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Date</label>
                <input
                  type="date"
                  className="border border-gray-300 p-2 rounded w-full"
                  value={editGame ? editGame.date : newGame.date}
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
