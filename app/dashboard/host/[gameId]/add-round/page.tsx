'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function CreateRound() {
  const router = useRouter();
  const { gameId } = useParams(); // Get the gameId from the URL parameters
  const [round, setRound] = useState({
    name: '',
    roundType: 'POINT_BASED',
    pointSystem: 'FLAT',
    maxPoints: null,
    timeLimit: null,
    wagerLimit: null,
    pointPool: [''], // Keep it as an array of strings initially
    pointValue: null,
    sortOrder: 1, // Default to 1 for new rounds
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: string | string[]) => {
    setRound({
      ...round,
      [field]: value,
    });
  };

  const validateRound = () => {
    if (!round.name.trim()) return 'Round name is required.';
    if (round.pointSystem === 'FLAT' && (round.pointValue === null || round.pointValue <= 0)) {
      return 'Point value must be greater than 0 for Flat Point System.';
    }
    if (round.pointSystem === 'POOL' && round.pointPool.every((p) => isNaN(parseInt(p, 10)))) {
      return 'Point pool must include valid numbers.';
    }
    return null;
  };

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();

    const validationError = validateRound();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    // Validate and convert the pointPool to an array of numbers
    const convertedPointPool = round.pointPool
      .map((value) => parseInt(value.trim(), 10))
      .filter((value) => !isNaN(value)); // Remove invalid values (NaN)

      const payload = {
        ...round,
        maxPoints: round.maxPoints ? Number(round.maxPoints) : null,
        timeLimit: round.timeLimit ? Number(round.timeLimit) : null,
        wagerLimit: round.wagerLimit ? Number(round.wagerLimit) : null,
        pointPool: convertedPointPool.length > 0 ? convertedPointPool : null, // Only send pointPool if it's valid
        pointValue: round.pointValue ? Number(round.pointValue) : null,
        sortOrder: Number(round.sortOrder) || 1, // Default to 1 if invalid

      };
      
    try {
      const response = await fetch(`/api/host/games/${gameId}/rounds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert('Round created successfully');
        router.push(`/dashboard/host/${gameId}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create round');
      }
    } catch (err) {
      console.error('Error creating round:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h1 className="text-3xl font-semibold text-center mb-8">Create New Round</h1>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      <form onSubmit={handleSubmit}>
        {/* Round Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700">Round Name</label>
          <input
            type="text"
            value={round.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Enter round name"
            className="mt-2 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Round Type */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700">Round Type</label>
          <select
            value={round.roundType}
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
            value={round.pointSystem}
            onChange={(e) => handleChange('pointSystem', e.target.value)}
            className="mt-2 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="FLAT">Flat Point System</option>
            <option value="POOL">Point Pool System</option>
          </select>
        </div>

        {/* Conditional Inputs */}
        {round.pointSystem === 'FLAT' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700">Point Value</label>
            <input
              type="number"
              value={round.pointValue || ''}
              onChange={(e) => handleChange('pointValue', e.target.value)}
              placeholder="Enter point value"
              className="mt-2 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        {round.pointSystem === 'POOL' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700">Point Pool</label>
            <input
              type="text"
              value={round.pointPool.join(', ')}
              onChange={(e) => handleChange('pointPool', e.target.value.split(','))}
              placeholder="Enter point values separated by commas"
              className="mt-2 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        {round.roundType === 'WAGER' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700">Max Points</label>
            <input
              type="number"
              value={round.maxPoints || ''}
              onChange={(e) => handleChange('maxPoints', e.target.value)}
              placeholder="Enter max points"
              className="mt-2 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        {round.roundType === 'TIME_BASED' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700">Time Limit (seconds)</label>
            <input
              type="number"
              value={round.timeLimit || ''}
              onChange={(e) => handleChange('timeLimit', e.target.value)}
              placeholder="Enter time limit"
              className="mt-2 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        {/* Sort Order */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700">Sort Order</label>
          <input
            type="number"
            value={round.sortOrder}
            onChange={(e) => handleChange('sortOrder', e.target.value)}
            placeholder="Enter sort order"
            className="mt-2 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-blue-500 text-white py-3 px-6 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Round'}
          </button>
        </div>
      </form>
      </div>
  );
}
