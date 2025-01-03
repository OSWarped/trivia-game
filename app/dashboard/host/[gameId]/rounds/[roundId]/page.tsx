'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Round {
  id: string;
  name: string;
  roundType: string;
  pointSystem: 'FLAT' | 'POOL'; // Point system type
  maxPoints: number | null;
  timeLimit: number | null;
  wagerLimit: number | null;
  pointPool: number[];
  pointValue: number | null;
  sortOrder: number;
}

export default function RoundDetails() {
  const { gameId, roundId } = useParams(); // Get gameId and roundId from URL params
  const router = useRouter();
  const [, setRound] = useState<Round | null>(null);
  const [error, setError] = useState<string>('');
  const [editedRound, setEditedRound] = useState<Round | null>(null);

  useEffect(() => {
    if (!roundId) return; // Don't fetch data if roundId is not available

    const fetchRoundData = async () => {
      try {
        // Fetch round data
        const roundRes = await fetch(`/api/host/games/${gameId}/rounds/${roundId}`);
        const roundData = await roundRes.json();

        if (roundData.error) {
          setError(roundData.error);
          return;
        }

        setRound(roundData); // Set round data
        setEditedRound(roundData); // Set editable round data
      } catch (err) {
        console.error('Error fetching round data:', err);
        setError('Failed to fetch round data.');
      }
    };

    fetchRoundData();
  }, [gameId, roundId]);

  const handleChange = (field: string, value: string | number | number[]) => {
    if (editedRound) {
      setEditedRound({
        ...editedRound,
        [field]: value,
      });
    }
  };

  const handleSaveRound = async () => {
    if (!gameId || !editedRound) return;

    // Construct the updated round data
    const updatedRoundData = {
      ...editedRound,
    };

    try {
      const res = await fetch(`/api/host/games/${gameId}/rounds/${roundId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRoundData),
      });

      if (res.ok) {
        router.push(`/dashboard/host/${gameId}`);
      } else {
        setError('Failed to save round');
      }
    } catch (err) {
      console.error(err);
      setError('Error while saving round');
    }
  };

  const handleDeleteRound = async (roundId: string) => {
    const response = await fetch(`/api/host/games/${gameId}/rounds/${roundId}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      alert('Round deleted successfully');
      router.push(`/dashboard/host/${gameId}`); // Redirect back to the game page after deletion
    } else {
      alert('Failed to delete round');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h1 className="text-3xl font-semibold text-center mb-8">Round Details</h1>
      {error && <div className="text-red-500 text-center">{error}</div>}

      {/* Display round details */}
      {editedRound && (
        <>
          <div className="mb-6">
            <h2 className="text-2xl">Edit Round: {editedRound.name}</h2>
          </div>

          {/* Round Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700">Round Name</label>
            <input
              type="text"
              value={editedRound.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="mt-2 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Round Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700">Round Type</label>
            <select
              value={editedRound.roundType}
              onChange={(e) => handleChange('roundType', e.target.value)}
              className="mt-2 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="POINT_BASED">Point-Based</option>
              <option value="TIME_BASED">Time-Based</option>
              <option value="WAGER">Wager</option>
            </select>
          </div>

          {/* Point System */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700">Point System</label>
            <select
              value={editedRound.pointSystem}
              onChange={(e) => handleChange('pointSystem', e.target.value)}
              className="mt-2 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="FLAT">Flat Point System</option>
              <option value="POOL">Point Pool System</option>
            </select>
          </div>

          {/* Point Value (if flat point system) */}
          {editedRound.pointSystem === 'FLAT' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700">Point Value</label>
              <input
                type="number"
                value={editedRound.pointValue ?? ''}
                onChange={(e) => handleChange('pointValue', parseInt(e.target.value))}
                className="mt-2 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Point Pool (if point pool system) */}
          {editedRound.pointSystem === 'POOL' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700">Point Pool</label>
              <input
                type="text"
                value={editedRound.pointPool.join(', ')}
                onChange={(e) => handleChange('pointPool', e.target.value.split(',').map(val => parseInt(val.trim(), 10)))}
                className="mt-2 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Max Points (if wager round) */}
          {editedRound.roundType === 'WAGER' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700">Max Points</label>
              <input
                type="number"
                value={editedRound.maxPoints ?? ''}
                onChange={(e) => handleChange('maxPoints', parseInt(e.target.value))}
                className="mt-2 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Time Limit (if time-based) */}
          {editedRound.roundType === 'TIME_BASED' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700">Time Limit (seconds)</label>
              <input
                type="number"
                value={editedRound.timeLimit ?? ''}
                onChange={(e) => handleChange('timeLimit', parseInt(e.target.value))}
                className="mt-2 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Sort Order */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700">Sort Order</label>
            <input
              type="number"
              value={editedRound.sortOrder}
              onChange={(e) => handleChange('sortOrder', parseInt(e.target.value))}
              className="mt-2 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-4 mt-8">
            <button
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              onClick={handleSaveRound}
            >
              Save Round
            </button>
            <button
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              onClick={() => router.push(`/dashboard/host/${gameId}`)}
            >
              Cancel
            </button>
            <button
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              onClick={() => handleDeleteRound(editedRound.id)}
            >
              Delete Round
            </button>
          </div>
        </>
      )}
    </div>
  );
}
