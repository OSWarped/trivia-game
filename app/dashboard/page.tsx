'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import Link from 'next/link';
import { User } from '@prisma/client';

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
  captainId: string;
  members: User[];
  hostingSites: { id: string; name: string; location: string }[]; // Add this
}

export default function PlayerDashboard() {
  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [hostingSites, setHostingSites] = useState<HostingSite[]>([]);
  const [availableTeams, setAvailableTeams] = useState<{ id: string; name: string; captainName: string; games: { id: string; name: string; hostingSite: {id:string,  name: string; location: string } }[] }[]>([]);
 const [selectedTeam, setSelectedTeam] = useState<null | {
  id: string;
  name: string;
  captainId: string;
  members: { id: string; name: string }[];
}>(null);

const [teamToJoin, setTeamToJoin] = useState<null | {
  id: string;
  name: string;
  games: { id: string }[];
}>(null);

  const [, setUser] = useState<string | null>(null); 
  const [userName, setUserName] = useState<string | null>(null);

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
    const fetchData = async () => {
      try {
        // Fetch auth details to get userId
        const authResponse = await fetch('/api/auth/me');
        const authData = await authResponse.json();
  
        let userName = "Player Dashboard"; // Default
        let userDetails = null;
  
        if (authData?.user?.userId) {
          const userId = authData.user.userId;
  
          // Fetch full user details from /api/users/[userId]
          try {
            const userResponse = await fetch(`/api/users/${userId}`);
            userDetails = await userResponse.json();
            console.log("userDeatils" + JSON.stringify(userDetails));
            console.log("user.name " + userDetails?.user?.name);
            if (userDetails?.user?.name) {
              setUser(userDetails.user);
              userName = userDetails.user?.name; // Set full name from API
            } else {
              userName = authData.user.email; // Fallback to email if no name exists
            }
          } catch (error) {
            console.error("Error fetching user details:", error);
          }
        }
  
        // Fetch other dashboard data
        const [sites, teams, games, pendingRequests, availableTeams] = await Promise.all([
          fetch('/api/player/sites').then((res) => res.json()),
          fetch('/api/player/teams').then((res) => res.json()),
          fetch('/api/player/games').then((res) => res.json()),
          fetch('/api/player/pending-requests').then((res) => res.json()), 
          fetch('/api/player/available-teams').then((res) => res.json()),
        ]);
  
        setUserName(userName); // Set the fetched userName
        setHostingSites(sites);
        setTeams(teams);
        setGames(games);
        setPendingRequests(pendingRequests);
        setAvailableTeams(availableTeams);
        setError(null);
      } catch {
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };


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
    
    fetchData();



    return () => {
      socket.off('joinRequestUpdate'); // Cleanup listener on unmount
      socket.off('team:gameStarted'); // Cleanup listener on unmount
      socket.disconnect(); // Clean up the socket connection
      
    };

    
  }, []);

  const toggleSiteMembership = async (siteId: string, currentlyJoined: boolean) => {
    try {
      const endpoint = currentlyJoined ? "/api/player/sites/leave" : "/api/player/sites/join";
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
      });
  
      // Update the user's site memberships
      setHostingSites((prev) =>
        prev.map((site) => (site.id === siteId ? { ...site, joined: !currentlyJoined } : site))
      );
  
      // ✅ Fetch the updated Available Teams list immediately
      const updatedAvailableTeams = await fetch("/api/player/available-teams").then((res) =>
        res.json()
      );
      setAvailableTeams(updatedAvailableTeams);
  
    } catch {
      setError("Failed to update site membership.");
    }
  };
  
  
  const handleJoinClick = (team: { id: string; name: string; games: { id: string }[] }) => {
    const teamInSameGame = teams.find((currentTeam) =>
      currentTeam.games.some((game) => team.games.some((g) => g.id === game.id))
    );
  
    if (teamInSameGame) {
      setTeamToJoin({
        id: team.id,
        name: team.name,
        games: team.games,
      });
    } else {
      sendJoinRequest(team.id);
    }
  };
  

  // Confirm join request after the user accepts the modal
  const confirmJoinRequest = () => {
    if (selectedTeam) {
      sendJoinRequest(selectedTeam.id);
      setSelectedTeam(null); // Close modal
    }
  };
  

  const sendJoinRequest = async (teamId: string) => {
    try {
      // Fetch join request and team details concurrently
      const [joinRequestRes, teamRes] = await Promise.all([
        fetch(`/api/teams/${teamId}/join-requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
        fetch(`/api/teams/${teamId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }),
      ]);
  
      if (!joinRequestRes.ok) throw new Error('Failed to create join request');
      if (!teamRes.ok) throw new Error('Failed to fetch team details');
  
      const requestData = await joinRequestRes.json(); // Join request details
      const searchedTeam = await teamRes.json(); // Team details
  
      console.log('Join request created:', requestData);
      console.log('Fetched team details:', searchedTeam);
  
      const team = availableTeams.find((t) => t.id === teamId);
  
      if (team) {
        setPendingRequests((prev) => [
          ...prev,
          {
            id: requestData.joinRequest.id,
            team: {
              id: team.id,
              name: team.name,
              captainName: team.captainName,
              game: { id: '', name: '' },
            },
            status: 'PENDING',
          },
        ]);
  
        setAvailableTeams((prev) => prev.filter((t) => t.id !== teamId));
  
        // Emit a socket event to notify the captain
        if (searchedTeam?.captain?.id) {
          const notificationMessage = `A new join request for ${team.name}`;
          socket.emit('player:joinRequestSent', {
            toUserId: searchedTeam.captain.id,
            teamId,
            requestId: requestData.joinRequest.id,
            message: notificationMessage,
          });
  
          // Save notification to the database
          await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: searchedTeam.captain.id,
              message: notificationMessage,
              link: `/team/${team.id}/manage`, // Example link
            }),
          });
        }
      }
    } catch (error) {
      console.error('Error sending join request:', error);
      setError('Failed to send join request.');
    }
  };
  

   // Cancel join request modal
   const cancelJoinRequest = () => {
    setSelectedTeam(null); // Close modal
  };



  const deleteJoinRequest = async (requestId: string) => {
    try {
      const res = await fetch('/api/player/pending-requests', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: requestId }), // Send requestId in the payload
      });
  
      if (!res.ok) throw new Error('Failed to delete request.');
  
      // Remove the canceled request from pendingRequests
      setPendingRequests((prev) => prev.filter((req) => req.id !== requestId));
  
      // Re-fetch the available teams to ensure consistency
      const updatedAvailableTeams = await fetch('/api/player/available-teams').then((res) => res.json());
      setAvailableTeams(updatedAvailableTeams);
  
      //alert('Join request deleted successfully!');
    } catch (error) {
      console.error('Error deleting join request:', error);
      setError('Failed to delete join request.');
    }
  };



  const handleViewTeam = async (teamId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}`);
      if (!res.ok) throw new Error("Failed to fetch team details");
  
      const teamData = await res.json();
      setSelectedTeam({
        id: teamData.id,
        name: teamData.name,
        captainId: teamData.captainId,
        members: teamData.members.map((m: { id: string; name: string }) => ({
          id: m.id,
          name: m.name,
        })),
      });
    } catch (error) {
      console.error("Error fetching team details:", error);
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
      <h1 className="text-3xl font-bold text-gray-800 mb-4"> {userName ? `Welcome, ${userName}!` : 'Loading...'}</h1>

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
      <hr className="my-6 border-t border-gray-300" />

      {/* Teams Section */}
      <section className="teams mb-8">
      <h2 className="text-xl font-semibold text-gray-700 mb-2">My Teams</h2>
      {teams.length > 0 ? (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => {
  // Combine hosting sites from team.games and team.hostingSites
  const uniqueSites = Array.from(
    new Map<string, { id: string; name: string; location: string }>(
      [
        // Add hosting sites from games
        ...team.games
          .filter((game) => game.hostingSite) // Ensure hostingSite exists
          .map((game) => [game.hostingSite.id, game.hostingSite] as [string, { id: string; name: string; location: string }]),
  
        // Add hosting sites directly assigned to the team
        ...team.hostingSites.map((site) => [site.id, site] as [string, { id: string; name: string; location: string }])
      ]
    ).values()
  );
  

  return (
    <li key={team.id} className="p-4 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-800">{team.name}</h3>
        {team.isCaptain && (
          <span className="inline-block px-2 py-1 text-xs font-bold text-white bg-blue-500 rounded">
            Captain
          </span>
        )}
      </div>

      {/* Display Hosting Sites */}
      {uniqueSites.length > 0 ? (
        <ul className="mt-2">
          {uniqueSites.map((site) => (
            <li key={site.id} className="text-sm text-gray-600">
              {site.name} - {site.location}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-600 mt-2">No hosting sites available</p>
      )}

      <div className="mt-4 flex space-x-2">
        {team.isCaptain && (
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600"
            onClick={() => router.push(`/team/${team.id}/manage`)}
          >
            Manage Team
          </button>
        )}
        <button
          className="px-4 py-2 bg-gray-500 text-white rounded-lg shadow hover:bg-gray-600"
          onClick={() => handleViewTeam(team.id)}
        >
          View Team
        </button>
      </div>
    </li>
  );
})}

        </ul>
      ) : (
        <p className="text-gray-600">You are not part of any teams yet.</p>
      )}

      {/* Create Team Button */}
      <button
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600"
        onClick={() => router.push("/team/create")}
      >
        Create a Team
      </button>

      {/* Team Members Modal */}
      {selectedTeam && (
  <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
    <div className="bg-white rounded-lg p-6 w-1/3 relative">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        {selectedTeam.name} Members
      </h2>
      <ul className="space-y-3">
        {selectedTeam.members.map((member) => (
          <li key={member.id} className="flex items-center justify-between p-2 bg-gray-100 rounded">
            <span className="flex items-center">
              {member.name}
              {member.id === selectedTeam.captainId && (
                <span className="ml-2 text-xs font-bold text-white bg-blue-500 px-2 py-1 rounded">
                  Captain
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
      <button
        className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600"
        onClick={() => setSelectedTeam(null)}
      >
        Close
      </button>
    </div>
  </div>
)}
</section>
<hr className="my-6 border-t border-gray-300" />
  
{/* Available Teams Section */}      
<section className="available-teams mb-8">
  <h2 className="text-xl font-semibold text-gray-700 mb-2">Available Teams</h2>
  {availableTeams.length > 0 ? (
    <ul className="space-y-4">
      {availableTeams.map((team) => {
        // Extract unique hosting sites from the team's games
        const uniqueSites = Array.from(
          new Map(
            team.games
              .filter((game) => game.hostingSite) // Ensure hostingSite exists
              .map((game) => [game.hostingSite.id, game.hostingSite]) // Use site ID as the key
          ).values()
        );

        return (
          <li key={team.id} className="p-4 bg-white rounded-lg shadow">
            <div>
              <h3 className="text-lg font-medium text-gray-800">{team.name}</h3>
              <p className="text-sm text-gray-600">Captain: {team.captainName}</p>

              {/* Display unique hosting sites */}
              {uniqueSites.length > 0 && (
                <div className="mt-2">
                  <h4 className="text-md font-semibold text-gray-700">Plays At:</h4>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {uniqueSites.map((site) => (
                      <li key={site.id}>
                        {site.name} ({site.location})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Join Button */}
            <button
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600"
              onClick={() => handleJoinClick(team)}
            >
              Join
            </button>
          </li>
        );
      })}
    </ul>
  ) : (
    <p className="text-gray-600">No available teams to join.</p>
  )}
</section>
<hr className="my-6 border-t border-gray-300" />



       {/* Confirmation Modal */}
       {teamToJoin && (
  <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
    <div className="bg-white rounded-lg p-6 w-1/3">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Confirm Join Request</h2>
      <p className="text-gray-700 mb-4">
        If you are approved to join <span className="font-bold">{teamToJoin.name}</span>,
        you will be removed from your current team in the same game. Are you sure you want to send this request?
      </p>
      <div className="flex justify-end space-x-4">
        <button
          className="px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600"
          onClick={() => setTeamToJoin(null)}
        >
          Cancel
        </button>
        <button
          className="px-4 py-2 bg-green-500 text-white rounded-lg shadow hover:bg-green-600"
          onClick={() => {
            sendJoinRequest(teamToJoin.id);
            setTeamToJoin(null);
          }}
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
)}


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
                  onClick={() => deleteJoinRequest(request.id)}
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
