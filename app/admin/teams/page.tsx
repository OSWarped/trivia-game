'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Team {
  id: string;
  name: string;
  game: {
    name: string | null;
  } | null;
  captain: {
    name: string | null;
  } | null;
}

interface Game {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
}

export default function ManageTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]); // Initialize as an empty array
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedCaptainId, setSelectedCaptainId] = useState<string | null>(null);

  // Fetch teams, games, and users
  useEffect(() => {
    async function fetchTeams() {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/teams');
        const data = await res.json();
        setTeams(data);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch teams');
      } finally {
        setLoading(false);
      }
    }

    async function fetchGames() {
      try {
        const res = await fetch('/api/admin/games');
        const data = await res.json();
        setGames(Array.isArray(data) ? data : []); // Ensure 'games' is an array
      } catch (err) {
        console.error('Failed to fetch games:', err);
      }
    }

    async function fetchUsers() {
      try {
        const res = await fetch('/api/admin/users');
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        console.error('Failed to fetch users:', err);
      }
    }

    fetchTeams();
    fetchGames();
    fetchUsers();
  }, []);

  async function handleAddTeam() {
    if (!newTeamName || !selectedGameId || !selectedCaptainId) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const res = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTeamName,
          gameId: selectedGameId,
          captainId: selectedCaptainId,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to add team');
      }

      const newTeam = await res.json();
      setTeams((prev) => [...prev, newTeam]);
      setShowModal(false);
      setNewTeamName('');
      setSelectedGameId(null);
      setSelectedCaptainId(null);
    } catch (err) {
      console.error('Error adding team:', err);
      alert('Failed to add team');
    }
  }

  if (loading) {
    return <div>Loading teams...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Manage Teams</h1>
      <button
        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mb-4"
        onClick={() => setShowModal(true)}
      >
        Add New Team
      </button>
      <ul className="space-y-4">
        {teams.map((team) => (
          <li
            key={team.id}
            className="flex justify-between items-center bg-white p-4 rounded shadow-md"
          >
            <div>
              <Link href={`/admin/teams/${team.id}`}>
                <h2 className="text-lg font-semibold text-blue-500 hover:underline cursor-pointer">
                  {team.name}
                </h2>
              </Link>
              <p className="text-sm text-gray-600">
                Game: {team.game?.name || 'Not Assigned'}
              </p>
              <p className="text-sm text-gray-600">
                Captain: {team.captain?.name || 'No Captain'}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-md w-1/2">
            <h2 className="text-xl font-bold mb-4">Add New Team</h2>
            <div className="space-y-4">
              <label className="block font-medium mb-1">Team Name</label>
              <input
                type="text"
                className="border border-gray-300 p-2 rounded w-full"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
              />

              <label className="block font-medium mb-1">Select Game</label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={selectedGameId || ''}
                onChange={(e) => setSelectedGameId(e.target.value)}
              >
                <option value="">Select a game</option>
                {games.map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.name}
                  </option>
                ))}
              </select>

              <label className="block font-medium mb-1">Select Captain</label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={selectedCaptainId || ''}
                onChange={(e) => setSelectedCaptainId(e.target.value)}
              >
                <option value="">Select a captain</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-4 mt-4">
              <button
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                onClick={handleAddTeam}
              >
                Add Team
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
