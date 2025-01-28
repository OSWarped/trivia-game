'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Team } from '@prisma/client';
import { io } from "socket.io-client";

const websocketURL = process.env.NEXT_PUBLIC_WEBSOCKET_URL;
const socket = io(websocketURL);



interface HostingSite {
  id: string;
  name: string;
  location: string;
  joined: boolean; // Indicates if the team is joined to the site

}
interface TeamGame {
  id: string;
  teamId: string;
  createdAt: Date;
  gameId: string;
}

interface Game {
  id: string;
  name: string;
  date: string;
  teams: { id: string }[];
  teamGames: TeamGame[];
}
interface TeamMember {
  id: string;
  name: string;
  email: string;
}

interface JoinRequest {
  id: string;
  userName: string; // Name of the requesting player
  status: string; // Status of the request (e.g., PENDING)
}

export default function ManageTeamPage() {
  const { teamId } = useParams();
  const [team, setTeam] = useState<Team | null>(null);
  const [hostingSites, setHostingSites] = useState<HostingSite[]>([]);
  const [upcomingGames, setUpcomingGames] = useState<{ [key: string]: Game[] }>({});
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;
  
    // Fetch team data and other related data
    Promise.all([
      fetch(`/api/teams/${teamId}`).then((res) => res.json()),
      fetch(`/api/teams/${teamId}/sites`).then((res) => res.json()),
      fetch(`/api/teams/${teamId}/members`).then((res) => res.json()),
      fetch(`/api/teams/${teamId}/join-requests`).then((res) => res.json()),
    ])
      .then(([teamData, sites, members, requests]) => {
        setTeam(teamData); // Populate team data
        setHostingSites(sites);
        setTeamMembers(members);
        setJoinRequests(requests);
  
        // Fetch games for all joined sites
        const joinedSites = sites.filter((site: HostingSite) => site.joined);
        return Promise.all(
          joinedSites.map((site: HostingSite) =>
            fetch(`/api/sites/${site.id}/games`)
              .then((res) => res.json())
              .then((games) => ({ siteId: site.id, games }))
          )
        );
      })
      .then((siteGames) => {
        const gamesBySite = siteGames.reduce((acc, { siteId, games }) => {
          acc[siteId] = games;
          return acc;
        }, {});
        setUpcomingGames(gamesBySite);
      })
      .catch((err) => {
        console.error('Error fetching data:', err);
        setError('Failed to fetch data');
      });
  }, [teamId]);
  
  

  const toggleSiteMembership = async (siteId: string, joined: boolean) => {
    const endpoint = joined
      ? `/api/teams/${teamId}/sites/leave`
      : `/api/teams/${teamId}/sites/join`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId }),
      });
      if (!res.ok) throw new Error();

      // Update hosting sites and games
      setHostingSites((prev) =>
        prev.map((site) => (site.id === siteId ? { ...site, joined: !joined } : site))
      );

      if (!joined) {
        // Fetch games for the newly joined site
        const gamesRes = await fetch(`/api/sites/${siteId}/games`);
        const gamesData = await gamesRes.json();
        setUpcomingGames((prev) => ({ ...prev, [siteId]: gamesData }));
      } else {
        // Remove games for the left site
        setUpcomingGames((prev) => {
          const { [siteId]: unused, ...remaining } = prev; // Replaced `_` with `unused`
          console.log(unused + ": I used the unused variable!!!");
          return remaining;
        });
      }      
    } catch {
      setError('Failed to update site membership');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/members/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: memberId }),
      });
      if (!res.ok) throw new Error();

      setTeamMembers((prev) => prev.filter((member) => member.id !== memberId));
    } catch {
      setError('Failed to remove team member');
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/join-requests/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });
      if (!res.ok) throw new Error();

      setJoinRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch {
      setError('Failed to approve join request');
    }
  };

  const handleDenyRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/join-requests/deny`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });
      if (!res.ok) throw new Error();

      setJoinRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch {
      setError('Failed to deny join request');
    }
  };

  const joinGame = async (gameId: string) => {
    if (!teamId || !team) return;
  
    try {
      const response = await fetch(`/api/games/${gameId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error || 'Failed to join the game.');
      }
  
      // Emit a WebSocket signal to notify other clients
      socket.emit('team:addToGame', {
        teamId,
        teamName: team.name,
        gameId,
      });
  
      // Update the `upcomingGames` state
      setUpcomingGames((prev) => {
        const siteId = Object.keys(prev).find((id) =>
          prev[id].some((game) => game.id === gameId)
        );
  
        if (!siteId) {
          console.warn('Site not found for the game.');
          return prev; // Return unchanged state
        }
  
        return {
          ...prev,
          [siteId]: prev[siteId].map((game) => {
            if (game.id === gameId) {
              // Ensure `teamGames` structure matches `TeamGame` type
              const updatedTeamGames: TeamGame[] = [
                ...game.teamGames,
                {
                  id: `${teamId}-${gameId}`, // Generate a unique ID
                  teamId: teamId as string,
                  createdAt: new Date(),
                  gameId,
                },
              ];
  
              return {
                ...game,
                teamGames: updatedTeamGames, // Updated teamGames array
              };
            }
            return game;
          }),
        };
      });
  
      console.log('Successfully joined the game and updated UI.');
    } catch (error) {
      console.error('Error joining game:', error);
      setError('Failed to join the game.');
    }
  };
  
  

  // const leaveGame = async (gameId: string) => {
  //   if (!teamId) return;
  
  //   try {
  //     const response = await fetch(`/api/games/${gameId}/leave`, {
  //       method: 'DELETE',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ teamId }),
  //     });
  
  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       throw new Error(errorData.error || 'Failed to leave the game.');
  //     }
  
  //     // Success: Reload upcoming games
  //     const updatedGames = await response.json();
  //     setUpcomingGames(updatedGames);
  //   } catch (error) {
  //     console.error('Error leaving game:', error);
  //     setError('Failed to leave the game.');
  //   }
  // };  
  

  // const formatDate = (date: string) =>
  //   new Date(date).toLocaleDateString('en-US', { timeZone: 'UTC' });

  return (
    <div className="manage-team bg-gray-100 min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-6">Manage Team</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Hosting Sites Section */}
      <section className="team-games mb-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Hosting Sites</h2>
        {hostingSites.map((site) => (
          <div key={site.id} className="p-4 bg-white rounded-lg shadow mb-4">
            <h3 className="text-lg font-medium text-gray-800">{site.name}</h3>
            <p className="text-sm text-gray-600">{site.location}</p>

            {/* Join/Leave Button */}
            <button
              className={`mt-2 px-4 py-2 rounded-lg shadow ${
                site.joined
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
              onClick={() => toggleSiteMembership(site.id, site.joined)}
            >
              {site.joined ? 'Leave' : 'Join'}
            </button>

            {/* Games List */}
            {site.joined && (
              <ul className="mt-2 space-y-2">
                {(upcomingGames[site.id] || []).map((game) => {
                  // Check if the team is already joined to this game
                  const isJoined = game.teamGames.some((tg) => tg.teamId === teamId);

                  return (
                    <li key={game.id} className="p-2 bg-gray-100 rounded-lg">
                      <h4 className="font-semibold">{game.name}</h4>
                      <p className="text-sm">Date: {new Date(game.date).toLocaleDateString()}</p>

                      {isJoined ? (
                        // Indicate that the team is already in this game
                        <p className="mt-1 text-green-600 font-medium">Already Joined</p>
                      ) : (
                        // Show Join button if the team is not in the game
                        <button
                          className="mt-1 px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600"
                          onClick={() => joinGame(game.id)}
                        >
                          Join Game
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </section>

      {/* Team Members */}
      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Team Members</h2>
        <ul className="space-y-4">
          {teamMembers.map((member) => (
            <li key={member.id} className="p-4 bg-white shadow rounded-lg flex justify-between">
              <div>
                <h3>{member.name}</h3>
                <p>{member.email}</p>
              </div>
              <button
                className="bg-red-500 text-white px-3 py-1 rounded-lg"
                onClick={() => handleRemoveMember(member.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Join Requests */}
      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Join Requests</h2>
        <ul className="space-y-4">
          {joinRequests.map((req) => (
            <li key={req.id} className="p-4 bg-white shadow rounded-lg flex justify-between">
              <div>
                <h3>{req.userName}</h3>
              </div>
              <div className="space-x-2">
                <button
                  className="bg-green-500 text-white px-3 py-1 rounded-lg"
                  onClick={() => handleApproveRequest(req.id)}
                >
                  Approve
                </button>
                <button
                  className="bg-red-500 text-white px-3 py-1 rounded-lg"
                  onClick={() => handleDenyRequest(req.id)}
                >
                  Deny
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
