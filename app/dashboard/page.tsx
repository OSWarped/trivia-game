'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import Link from 'next/link';

const socket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL); // Your Socket.IO server URL
console.log('Connecting to Socket.IO server:', process.env.NEXT_PUBLIC_WEBSOCKET_URL);

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
  status: string;
}

interface Team {
  id: string;
  name: string;
  games: Game[];
  isCaptain: boolean;
}

export default function PlayerDashboard() {
  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [hostingSites, setHostingSites] = useState<HostingSite[]>([]);
  const [availableTeams, setAvailableTeams] = useState<{ id: string; name: string; captainName: string; games: { id: string; name: string; hostingSite: { name: string; location: string } }[] }[]>([]);
 // const [submittedRequests, setSubmittedRequests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  //const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<
  { id: string; team: { id: string; name: string; captainName: string; game: { id: string; name: string } }; status: string }[]
>([]);

  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    // Fetch initial data
    Promise.all([
      fetch('/api/player/sites').then((res) => res.json()),
      fetch('/api/player/teams').then((res) => res.json()),
      fetch('/api/player/games').then((res) => res.json()),
      fetch('/api/player/pending-requests').then((res) => res.json()), // New API call
      fetch('/api/player/available-teams').then((res) => res.json()),
    ])
      .then(([sites, teams, games, pendingRequests, availableTeams]) => {
        setHostingSites(sites);
        setTeams(teams);
        setGames(games);
        setPendingRequests(pendingRequests); // New state for pending requests
        setAvailableTeams(availableTeams);
        setError(null);
      })
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));


    // Socket.IO listeners for real-time updates   
    socket.on('joinRequestUpdate', (data) => {
      setPendingRequests((prev) =>
        prev.map((req) =>
          req.id === data.requestId ? { ...req, status: data.status } : req
        )
      );
    });


    socket.on("team:gameStarted", (payload) => {
      const { gameId } = payload;
     console.log('Payload received from server: ' + JSON.stringify(payload));
      setGames((prevGames) => {
        console.log("Payload gameId:", gameId); // Log the gameId from payload
        return prevGames.map((game) => {
          console.log("Checking gameId:", game.id, "against payload gameId:", gameId);
          if (game.id === gameId) {
            console.log("Match found. Updating status to IN_PROGRESS for game:", game.name);
            return { ...game, status: "IN_PROGRESS" };
          }
          return game;
        });
      });
    });
    
    



    return () => {
      socket.off('joinRequestUpdate'); // Cleanup listener on unmount
      socket.off('team:gameStarted'); // Cleanup listener on unmount
      socket.disconnect(); // Clean up the socket connection
      
    };
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

  // const fetchAvailableTeams = async () => {
  //   try {
  //     const res = await fetch('/api/teams/available');
  //     if (!res.ok) throw new Error();
  //     const data = await res.json();
  //     setAvailableTeams(data);
  //   } catch {
  //     setError('Failed to fetch available teams.');
  //   }
  // };

  const sendJoinRequest = async (teamId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/join-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
  
      if (!res.ok) throw new Error();
  
      const updatedTeams = availableTeams.filter((team) => team.id !== teamId);
      setAvailableTeams(updatedTeams);
  
      // Optionally notify the user
      alert('Join request sent successfully!');
    } catch {
      setError('Failed to send join request.');
    }
  };

  const cancelJoinRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/player/pending-requests/${requestId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to cancel request.');
  
      // Remove the canceled request from the UI
      setPendingRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (error) {
      console.error('Error canceling join request:', error);
      setError('Failed to cancel request.');
    }
  };

  const formatDateUTC = (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()}`;
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="dashboard bg-gray-100 min-h-screen p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Player Dashboard</h1>

      {/* Hosting Sites Section */}
      <section className="hosting-sites mb-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Hosting Sites</h2>
        <ul className="space-y-4">
          {hostingSites.map((site) => (
            <li key={site.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
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

      {/* Teams Section */}
      <section className="teams mb-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">My Teams</h2>
        {teams.length > 0 ? (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <li key={team.id} className="p-4 bg-white rounded-lg shadow">
                <div className="flex justify-between items-center">
                  {/* Team Name */}
                  <h3 className="text-lg font-medium text-gray-800">{team.name}</h3>
                  {/* Captain Badge */}
                  {team.isCaptain && (
                    <span className="inline-block px-2 py-1 text-xs font-bold text-white bg-blue-500 rounded">
                      Captain
                    </span>
                  )}
                </div>

                {/* Games Associated with the Team */}
                {/*team.games.length > 0 ? (
                  <ul className="mt-2">
                    {team.games.map((game) => (
                      <li key={game.id} className="text-sm text-gray-600">
                        {game.name} - {game.hostingSite.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-600 mt-2">No games assigned</p>
                )*/}

                {/* Manage Team Button for Captains */}
                {team.isCaptain && (
                  <button
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600"
                    style={{ width: 'auto' }} // Fixed width for the button
                    onClick={() => router.push(`/team/${team.id}/manage`)}
                  >
                    Manage Team
                  </button>
                )}

                {/* View Team Link */}
                <Link
                  href={`/team/${team.id}`}
                  className="text-blue-500 hover:underline mt-2 block"
                >
                  View Team
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600">You are not part of any teams yet.</p>
        )}
      </section>


      {/* Available Teams Section */}
      <section className="available-teams mb-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Available Teams</h2>
        {availableTeams.length > 0 ? (
          <ul className="space-y-4">
            {availableTeams.map((team) => (
              <li key={team.id} className="p-4 bg-white rounded-lg shadow flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-800">{team.name}</h3>
                  <p className="text-sm text-gray-600">Captain: {team.captainName}</p>
                  {/*team.games.map((game) => (
                    <p key={game.id} className="text-sm text-gray-500">
                      Game: {game.name} ({game.hostingSite.name}, {game.hostingSite.location})
                    </p>
                  ))*/}
                </div>
                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600"
                  onClick={() => sendJoinRequest(team.id)}
                >
                  Join
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600">No available teams to join.</p>
        )}
      </section>

      {/* Pending Requests Section */}
      <section className="pending-requests mb-8">
  <h2 className="text-xl font-semibold text-gray-700 mb-2">Pending Requests</h2>
  {pendingRequests.length > 0 ? (
    <ul className="space-y-4">
      {pendingRequests.map((request) => (
        <li
          key={request.id}
          className="p-4 bg-white rounded-lg shadow flex justify-between items-center"
        >
          <div>
            <h3 className="text-lg font-medium text-gray-800">{request.team.name}</h3>
            <p className="text-sm text-gray-600">Captain: {request.team.captainName}</p>
            
            <p className="text-sm text-gray-500">Status: {request.status}</p>
          </div>
          <button
            className="px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600"
            onClick={() => cancelJoinRequest(request.id)}
          >
            Cancel
          </button>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-gray-600">No pending requests at the moment.</p>
  )}
</section>



      {/* Games Section */}
      <section className="games">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Upcoming Games</h2>
        {games.length > 0 ? (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map((game) => (
              <li key={game.id} className="p-4 bg-white rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-800">{game.name}</h3>
                <p className="text-gray-600 text-sm">
                  Location: {game.hostingSite.name} ({game.hostingSite.location})
                </p>
                <p className="text-gray-600 text-sm">Date: {formatDateUTC(game.date)}</p>
                {/* Display Join Game button only for IN_PROGRESS games */}
                {game.status === "IN_PROGRESS" && (
                  <button
                    className="mt-2 px-4 py-2 bg-green-500 text-white rounded-lg shadow hover:bg-green-600"
                    onClick={() => router.push(`/join/${game.id}`)} // Navigate to the join page
                  >
                    Join Game
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600">No upcoming games found.</p>
        )}
      </section>

    </div>
  );
}
