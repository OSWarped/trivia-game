'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Interfaces for data types
interface HostingSite {
  id: string;
  name: string;
  location: string;
  joined: boolean;
}

interface Game {
  id: string;
  name: string;
  date: string;
  hostingSite: HostingSite;
}

interface Team {
  id: string;
  name: string;
  game: Game;
  isCaptain: boolean;
}

export default function PlayerDashboard() {
  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [hostingSites, setHostingSites] = useState<HostingSite[]>([]);
  const [availableTeams, setAvailableTeams] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedRequests, setSubmittedRequests] = useState<string[]>([]);

  const router = useRouter();

  useEffect(() => {
    setLoading(true);

    Promise.all([
      fetch('/api/player/sites').then((res) => res.json()),
      fetch('/api/player/teams').then((res) => res.json()),
      fetch('/api/player/games').then((res) => res.json()),
    ])
      .then(([sites, teams, games]) => {
        setHostingSites(sites);
        setTeams(teams);
        setGames(games);
        setError(null);
      })
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  }, []);

  

  const toggleSiteMembership = async (siteId: string, currentlyJoined: boolean) => {
    try {
      const endpoint = currentlyJoined ? '/api/player/sites/leave' : '/api/player/sites/join';
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId }),
      });
      setHostingSites((prev) =>
        prev.map((site) => (site.id === siteId ? { ...site, joined: !currentlyJoined } : site))
      );
    } catch {
      setError('Failed to update site membership.');
    }
  };

  const fetchAvailableTeams = async () => {
    try {
      const res = await fetch('/api/teams/available');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAvailableTeams(data);
    } catch {
      setError('Failed to fetch available teams.');
    }
  };

  const sendJoinRequest = async (teamId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/join-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
  
      if (!response.ok) {
        throw new Error('Failed to send join request.');
      }
  
      const data = await response.json();
      console.log('Join request successful:', data);
  
      // Update state to mark this team as having a submitted request
      setSubmittedRequests((prev) => [...prev, teamId]);
    } catch (error) {
      console.error('Error sending join request:', error);
      setError('Failed to send join request.');
    }
  };

  const formatDateUTC = (dateString: string): string => {
    const date = new Date(dateString); // Parse the UTC date string
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0'); // Months are 0-based
    const day = date.getUTCDate().toString().padStart(2, '0'); // Use UTC day
    const year = date.getUTCFullYear();
    return `${month}/${day}/${year}`;
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="dashboard bg-gray-100 min-h-screen p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Player Dashboard</h1>

      <section className="hosting-sites mb-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Hosting Sites</h2>
        <ul className="space-y-4">
          {hostingSites.map((site) => (
            <li
              key={site.id}
              className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
            >
              <div>
                <h3 className="text-lg font-medium text-gray-800">{site.name}</h3>
                <p className="text-sm text-gray-600">{site.location}</p>
              </div>
              <button
                onClick={() => toggleSiteMembership(site.id, site.joined)}
                className={`px-4 py-2 rounded-lg shadow text-white ${
                  site.joined ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {site.joined ? 'Leave' : 'Join'}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="teams mb-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">My Teams</h2>
        {teams.length > 0 ? (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <li key={team.id} className="p-4 bg-white rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-800">{team.name}</h3>
                
                {team.isCaptain && (
                  <div className="mt-2">
                    <span className="inline-block px-2 py-1 text-xs font-bold text-white bg-blue-500 rounded">
                      Captain
                    </span>
                    <button
                      className="mt-2 block w-full px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600"
                      onClick={() => router.push(`/team/${team.id}/manage`)}
                    >
                      Manage Team
                    </button>
                  </div>
                )}
                <Link href={`/team/${team.id}`} className="text-blue-500 hover:underline mt-2 block">
                  View Team
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600">You are not part of any teams yet.</p>
        )}
        <div className="mt-4 flex space-x-4">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600"
            onClick={() => router.push('/team/create')}
          >
            Create a Team
          </button>
          <button
            className="px-4 py-2 bg-green-500 text-white rounded-lg shadow hover:bg-green-600"
            onClick={() => {
              setModalOpen(true);
              fetchAvailableTeams();
            }}
          >
            Join a Team
          </button>
        </div>
      </section>

      <section className="games">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Upcoming Games</h2>
        {games.length > 0 ? (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map((game) => {
              const isToday = new Date(game.date).toDateString() === new Date().toDateString();

              return (
                <li key={game.id} className="p-4 bg-white rounded-lg shadow">
                  <h3 className="text-lg font-medium text-gray-800">{game.name}</h3>
                  <p className="text-gray-600 text-sm">
                    Date: {formatDateUTC(new Date(game.date).toISOString())}
                    <br />
                    Location: {game.hostingSite.name} ({game.hostingSite.location})
                  </p>
                  {isToday && (
                    <button
                      className="mt-2 px-4 py-2 bg-green-500 text-white rounded-lg shadow hover:bg-green-600"
                      onClick={() => alert(`Join game: ${game.name}`)}
                    >
                      Join Game
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-gray-600">No upcoming games found.</p>
        )}
      </section>

      {modalOpen && (
  <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
    <div className="bg-white rounded-lg p-6 w-1/3">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Join a Team</h2>
      {availableTeams.map((team) => {
        const hasSubmittedRequest = submittedRequests.includes(team.id);

        return (
          <div key={team.id} className="flex justify-between items-center">
            <span className="text-gray-700">{team.name}</span>
            {hasSubmittedRequest ? (
              <span className="text-green-600">Request Submitted</span>
            ) : (
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                onClick={() => sendJoinRequest(team.id)}
              >
                Join
              </button>
            )}
          </div>
        );
      })}
      <button
        className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
        onClick={() => setModalOpen(false)}
      >
        Close
      </button>
    </div>
  </div>
)}

    </div>
  );
}
