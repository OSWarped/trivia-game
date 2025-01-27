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

interface Question {
  id: string;
  text: string;
  type: string;
  points: number;
  timeLimit: number;
}

export default function RoundDetails() {
  const { gameId, roundId } = useParams(); // Get gameId and roundId from URL params
  const router = useRouter();
  const [, setRound] = useState<Round | null>(null);
  const [error, setError] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editedRound, setEditedRound] = useState<Round | null>(null);
  const [poolPoints, setPoolPoints] = useState<string>(''); // String for comma-separated pool points

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

        // Set pool points for POOL system
        if (roundData.pointSystem === 'POOL') {
          setPoolPoints(roundData.pointPool.join(', '));
        }
      } catch (err) {
        console.error('Error fetching round data:', err);
        setError('Failed to fetch round data.');
      }
    };

    const fetchQuestions = async () => {
      try {
        const res = await fetch(`/api/host/games/${gameId}/rounds/${roundId}/questions`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch questions');
        }

        setQuestions(data);
      } catch (err) {
        console.error('Error fetching questions:', err);
        setError('Failed to fetch questions for this round.');
      }
    };

    fetchRoundData();
    fetchQuestions();
  }, [gameId, roundId]);

  const handleChange = (field: string, value: string | number | number[] | null) => {
    if (editedRound) {
      setEditedRound({
        ...editedRound,
        [field]: value,
      });
    }
  };
  

  const handleSaveRound = async () => {
    if (!gameId || !editedRound) return;

    try {
      const payload = {
        ...editedRound,
        pointPool: editedRound.pointSystem === 'POOL' ? poolPoints.split(',').map((p) => parseInt(p.trim())) : [],
      };

      const res = await fetch(`/api/host/games/${gameId}/rounds/${roundId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
              value={editedRound.name || ''}
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
              <option value="FLAT">Flat</option>
              <option value="POOL">Pool</option>
            </select>
          </div>

          {/* Point Value or Pool */}
          {editedRound.pointSystem === 'FLAT' ? (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700">Point Value</label>
              <input
                type="number"
                value={editedRound.pointValue !== null ? editedRound.pointValue : ''}
                onChange={(e) => handleChange('pointValue', e.target.value === '' ? null : parseInt(e.target.value))}
                className="mt-2 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ) : (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700">Point Pool (Comma-Separated)</label>
              <input
                type="text"
                value={poolPoints}
                onChange={(e) => setPoolPoints(e.target.value)}
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
              onChange={(e) => handleChange('sortOrder', parseInt(e.target.value) || 0)}
              className="mt-2 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Questions Section */}
          <section className="mt-8">
            <h2 className="text-2xl font-semibold">Questions ({questions.length})</h2>
            <ul className="space-y-4 mt-4">
              {questions.length > 0 ? (
                questions.map((question) => (
                  <li
                    key={question.id}
                    className="bg-gray-100 p-4 rounded-lg flex justify-between items-center"
                  >
                    <div>
                      <h3 className="text-lg font-medium">{question.text}</h3>
                      <p className="text-sm text-gray-600">Type: {question.type}</p>
                      <p className="text-sm text-gray-600">Points: {question.points}</p>
                      <p className="text-sm text-gray-600">Time Limit: {question.timeLimit || 'None'}</p>
                    </div>
                    <button
                      className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
                      onClick={() =>
                        router.push(`/dashboard/host/${gameId}/rounds/${roundId}/questions/${question.id}/edit`)
                      }
                    >
                      Edit
                    </button>
                  </li>
                ))
              ) : (
                <p className="text-gray-500">No questions added yet. Click &apos;Add Question&apos; to create one.</p>
              )}
            </ul>
            <div className="flex justify-end mt-4">
              <button
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                onClick={() =>
                  router.push(`/dashboard/host/${gameId}/rounds/${roundId}/questions/add`)
                }
              >
                Add Question
              </button>
            </div>
          </section>

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
