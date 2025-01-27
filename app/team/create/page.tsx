'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface HostingSite {
  id: string;
  name: string;
  location: string;
}

export default function CreateTeam() {
  const [teamName, setTeamName] = useState('');
  const [hostingSites, setHostingSites] = useState<HostingSite[]>([]);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Fetch hosting sites
  useEffect(() => {
    const fetchHostingSites = async () => {
      try {
        const response = await fetch('/api/sites');
        if (!response.ok) {
          throw new Error('Failed to fetch hosting sites');
        }
        const data = await response.json();
        setHostingSites(data);
      } catch (err) {
        console.error('Error fetching hosting sites:', err);
        setError('Failed to load hosting sites');
      }
    };

    fetchHostingSites();
  }, []);

  const handleSubmit = async () => {
    if (!teamName.trim()) {
      setError('Team name is required');
      return;
    }

    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: teamName,
          hostingSiteIds: selectedSites, // Send selected hosting site IDs
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create team');
      }

      // Redirect to dashboard after successful creation
      router.push('/dashboard');
    } catch (error) {
      console.error('Error creating team:', error);
      //setError(error.message || 'Failed to create team');
    }
  };

  const toggleSiteSelection = (siteId: string) => {
    setSelectedSites((prev) =>
      prev.includes(siteId)
        ? prev.filter((id) => id !== siteId) // Remove if already selected
        : [...prev, siteId] // Add if not selected
    );
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Create New Team</h1>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      <label className="block font-medium mb-2">Team Name</label>
      <input
        type="text"
        className="border border-gray-300 p-2 rounded w-full mb-6"
        value={teamName}
        onChange={(e) => setTeamName(e.target.value)}
        placeholder="Enter your team name"
      />

      <h2 className="text-xl font-semibold mb-4">Select Hosting Sites</h2>
      {hostingSites.length > 0 ? (
        <ul className="space-y-4">
          {hostingSites.map((site) => (
            <li
              key={site.id}
              className="p-4 bg-white rounded-lg shadow flex justify-between items-center"
            >
              <div>
                <h3 className="text-lg font-medium">{site.name}</h3>
                <p className="text-sm text-gray-600">{site.location}</p>
              </div>
              <button
                className={`px-4 py-2 rounded-lg shadow ${
                  selectedSites.includes(site.id)
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
                onClick={() => toggleSiteSelection(site.id)}
              >
                {selectedSites.includes(site.id) ? 'Remove' : 'Add'}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-600">No hosting sites available</p>
      )}

      <button
        onClick={handleSubmit}
        className="mt-6 px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg shadow hover:bg-blue-600"
      >
        Create Team
      </button>
    </div>
  );
}
