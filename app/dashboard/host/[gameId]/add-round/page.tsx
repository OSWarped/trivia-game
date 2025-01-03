'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import router from 'next/router';

export default function CreateRound() {
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
    sortOrder: 0,
  });

  const handleChange = (field: string, value: string | string[]) => {
    setRound({
      ...round,
      [field]: value,
    });
  };

  const handleSubmit = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();

    // Validate and convert the pointPool to an array of numbers
    const convertedPointPool = round.pointPool
      .map((value) => parseInt(value.trim(), 10))
      .filter((value) => !isNaN(value)); // Remove invalid values (NaN)

    const payload = {
      ...round,
      maxPoints: round.maxPoints === '' ? null : Number(round.maxPoints),
      timeLimit: round.timeLimit === '' ? null : Number(round.timeLimit),
      wagerLimit: round.wagerLimit === '' ? null : Number(round.wagerLimit),
      pointPool: convertedPointPool.length > 0 ? convertedPointPool : null, // Only send pointPool if it's valid
      pointValue: round.pointValue === '' ? null : Number(round.pointValue),
      sortOrder: Number(round.sortOrder),
    };

    const response = await fetch(`/api/host/games/${gameId}/rounds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      alert('Round created successfully');
      // Redirect to the game page where rounds are displayed
      router.push(`/dashboard/host/${gameId}`);
    } else {
      alert('Failed to create round');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h1 className="text-3xl font-semibold text-center mb-8">Create New Round</h1>

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

        {/* Point Value (if flat point system) */}
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

        {/* Point Pool (if point pool system) */}
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

        {/* Max Points (if wager round) */}
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

        {/* Time Limit (if time-based) */}
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
            value={round.sortOrder || 1}
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
          >
            Save Round
          </button>
        </div>
      </form>
    </div>
  );
}
