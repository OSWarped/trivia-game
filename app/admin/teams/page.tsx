'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Team {
  id: string;
  name: string;
  captain: {
    name: string | null;
  } | null;
  hostingSites: {
    id: string;
    name: string;
  }[];
}

interface HostingSite {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
}

export default function ManageTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sites, setSites] = useState<HostingSite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedCaptainId, setSelectedCaptainId] = useState<string | null>(null);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);

  // Fetch teams, users, and sites
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [teamsRes, usersRes, sitesRes] = await Promise.all([
          fetch('/api/admin/teams'),
          fetch('/api/admin/users'),
          fetch('/api/admin/sites'),
        ]);
        const [teamsData, usersData, sitesData] = await Promise.all([
          teamsRes.json(),
          usersRes.json(),
          sitesRes.json(),
        ]);
        setTeams(teamsData);
        setUsers(usersData);
        setSites(sitesData);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  async function handleAddTeam() {
    if (!newTeamName.trim() || !selectedCaptainId) {
      alert('Please fill in all required fields');
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
          captainId: selectedCaptainId,
          siteIds: selectedSites,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to add team');
      }

      const newTeam = await res.json();
      setTeams((prev) => [...prev, newTeam]);
      setShowModal(false);
      setNewTeamName('');
      setSelectedCaptainId(null);
      setSelectedSites([]);
    } catch (err) {
      console.error('Error adding team:', err);
      alert('Failed to add team');
    }
  }

  function toggleSiteSelection(siteId: string) {
    setSelectedSites((prev) =>
      prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId]
    );
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
              <h2 className="text-lg font-semibold">{team.name}</h2>
              <p className="text-sm text-gray-600">
                Captain: {team.captain?.name || 'No Captain'}
              </p>
              <p className="text-sm text-gray-600">
  Hosting Sites: {team.hostingSites?.map((site) => site.name).join(', ') || 'None'}
</p>
            </div>
            <div className="flex space-x-4">
              <Link href={`/admin/teams/${team.id}`} passHref>
                <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                  Edit
                </button>
              </Link>
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

              <label className="block font-medium mb-1">Select Hosting Sites</label>
              <ul className="space-y-2">
                {sites.map((site) => (
                  <li key={site.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedSites.includes(site.id)}
                      onChange={() => toggleSiteSelection(site.id)}
                    />
                    <span>{site.name}</span>
                  </li>
                ))}
              </ul>
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
