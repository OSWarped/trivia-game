'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';

// interface Game {
//   id: string;
//   name: string;
//   date: string;
//   hostingSiteId: string;
//   hostId: string;
// }

interface User {
  id: string;
  name: string;
}

export default function EditGame() {
  const router = useRouter();
  const { id } = useParams();
  //const [game, setGame] = useState<Game | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [newGameName, setNewGameName] = useState('');
  const [newDate, setNewDate] = useState('');
  const [hostingSiteId, setHostingSiteId] = useState('');
  const [hostId, setHostId] = useState('');

  // Fetch game data and users
  useEffect(() => {
    async function fetchGame() {
      try {
        const res = await fetch(`/api/admin/games/${id}`);
        const data = await res.json();

        if (data) {
          //setGame(data);
          setNewGameName(data.name);
          setNewDate(data.date);
          setHostingSiteId(data.hostingSiteId);
          setHostId(data.hostId);
        }
      } catch (err) {
        console.error('Error fetching game:', err);
        setError('Failed to fetch game data');
      }
    }

    async function fetchUsers() {
      try {
        const res = await fetch('/api/admin/users');
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to fetch users');
      }
    }

    fetchGame();
    fetchUsers();
  }, [id]);

  const handleSaveChanges = async () => {
    if (!newGameName || !newDate || !hostId) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const res = await fetch(`/api/admin/games/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGameName,
          date: newDate,
          hostingSiteId,
          hostId,
        }),
      });

      if (!res.ok) {
        alert('Failed to update game');
        return;
      }

      const updatedGame = await res.json();
      router.push(`/admin/games/${updatedGame.id}`); // Redirect to the updated game details page
    } catch (err) {
      console.error('Error saving changes:', err);
      alert('Failed to save changes');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Edit Game</h1>

      <div className="bg-white p-6 rounded shadow-md">
        <div>
          <label className="block font-medium mb-1">Game Name</label>
          <input
            type="text"
            className="border border-gray-300 p-2 rounded w-full"
            value={newGameName}
            onChange={(e) => setNewGameName(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Date</label>
          <input
            type="date"
            className="border border-gray-300 p-2 rounded w-full"
            value={newDate.substring(0, 10)} // Ensure the correct date format
            onChange={(e) => setNewDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Hosting Site</label>
          <select
            className="border border-gray-300 p-2 rounded w-full"
            value={hostingSiteId}
            onChange={(e) => setHostingSiteId(e.target.value)}
          >
            {/* Options for hosting sites */}
          </select>
        </div>

        <div>
          <label className="block font-medium mb-1">Host</label>
          <select
            className="border border-gray-300 p-2 rounded w-full"
            value={hostId}
            onChange={(e) => setHostId(e.target.value)}
          >
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
            onClick={handleSaveChanges}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
