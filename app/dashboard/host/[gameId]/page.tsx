'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';
import { io } from 'socket.io-client';

const websocketURL = process.env.NEXT_PUBLIC_WEBSOCKET_URL?.trim() || 'http://localhost:3009';

console.log("🔌 Connecting to socket at:", websocketURL);
const socket = io(websocketURL, { transports: ['websocket'] });
//const socket = io('http://192.168.1.75:3009');
//const socket = io('http://104.56.124.234:3009');


interface HostingSite {
  id: string;
  name: string;
  location: string;
}

interface Game {
  id: string;
  name: string;
  date: string;
  hostingSite: HostingSite;
  hostId: string;
  host: { name: string };
  status: string; // PENDING, IN_PROGRESS, COMPLETED
}

interface Round {
  id: string;
  name: string;
  roundType: string;
  pointSystem: string;
}

interface Team {
  id: string;
  name: string;
}

export default function GameSetup() {
  const { gameId } = useParams();
  //const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  //const [newTeamName, setNewTeamName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!gameId) return;
  
    const fetchGameData = async () => {
      try {
        const [gameRes, roundsRes, teamsRes, availableTeamsRes] = await Promise.all([
          fetch(`/api/host/games/${gameId}`),
          fetch(`/api/host/games/${gameId}/rounds`),
          fetch(`/api/host/games/${gameId}/teams`),
          fetch(`/api/host/games/${gameId}/available-teams`),
        ]);
  
        const [gameData, roundsData, teamsData, availableTeamsData] = await Promise.all([
          gameRes.json(),
          roundsRes.json(),
          teamsRes.json(),
          availableTeamsRes.json(),
        ]);
  
        if (gameData.error) throw new Error(gameData.error);
  
        setGame(gameData);
        setRounds(roundsData);
        setTeams(teamsData);
        setAvailableTeams(availableTeamsData);
      } catch (err) {
        console.error('Error fetching game data:', err);
        setError('Failed to fetch game data.');
      } finally {
        setLoading(false);
      }
    };
  
    // Listen for team updates
    socket.on("team:update", (data) => {
      console.log('Recieved a signal that team: ' + data.teamName + ' is added to game: ' + data.gameId);
      if (data.gameId !== gameId) return;
  
      if (data.type === "add") {
        // Synchronize state: remove from availableTeams, add to teams
        setAvailableTeams((prevAvailableTeams) =>
          prevAvailableTeams.filter((t) => t.id !== data.teamId)
        );
    
        setTeams((prevTeams) => [
          ...prevTeams,
          {
            id: data.teamId,
            name: data.teamName,
          },
        ]); // Ensure the team object includes id and name
      } else if (data.type === "remove") {
        setTeams((prev) => prev.filter((team) => team.id !== data.teamId));
        setAvailableTeams((prev) => {
          const removedTeam = prev.find((team) => team.id === data.teamId);
          return removedTeam ? [...prev, removedTeam] : prev;
        });
      }
    });
  
    fetchGameData();
  
    return () => {
      socket.off("team:update");
    };
  }, [gameId]);
  
  

  const handleAddExistingTeam = async (teamId: string) => {
    try {
      // Add the team via the API
      const response = await fetch(`/api/host/games/${gameId}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      });
  
      if (!response.ok) throw new Error('Failed to add team.');
  
      const result = await response.json(); // Destructure response
      const { team } = result; // Extract the team object
  
      if (!team) throw new Error('Invalid team object returned from API.');
  
      // Synchronize state: remove from availableTeams, add to teams
      setAvailableTeams((prevAvailableTeams) =>
        prevAvailableTeams.filter((t) => t.id !== teamId)
      );
  
      setTeams((prevTeams) => [
        ...prevTeams,
        {
          id: team.id,
          name: team.name,
        },
      ]); // Ensure the team object includes id and name
    } catch (err) {
      console.error('Error adding team:', err);
      setError('Failed to add existing team.');
    }
  };

  const handleRemoveTeam = async (teamId: string) => {
    try {
      const response = await fetch(`/api/host/games/${gameId}/teams`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to remove team');
      }
  
      //const data = await response.json();
      //alert(data.message || 'Team removed successfully!');
  
      // Update the UI state
      setTeams((prev) => prev.filter((team) => team.id !== teamId));
      setAvailableTeams((prev) => [...prev, teams.find((team) => team.id === teamId)!]);
    } catch (error) {
      console.error('Error removing team:', error);
      alert('Failed to remove team.');
    }
  };   

  const handleCopyToClipboard = () => {
    const gameLink = `http://localhost:3001/join/${gameId}`; // Replace with production link
    navigator.clipboard.writeText(gameLink).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const handleSendEmail = async () => {
    try {
      const email = prompt('Enter the recipient\'s email address:');
      if (!email) return;

      const gameLink = `http://localhost:3001/join/${gameId}`; // Replace with production link

      const response = await fetch('/api/host/send-qrcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, gameLink }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      alert('QR code sent successfully!');
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send the email.');
    }
  };

  const handleStartGame = async () => {
    try {
      const response = await fetch(`/api/host/games/${gameId}/start`, {
        method: 'POST',
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start the game");
      }
  
      const data = await response.json();
      alert(data.message || "Game started successfully!");

       // Emit the gameStarted event to all connected clients
      console.log('Sending Signal: host:gameStarted: ' + JSON.stringify(data));

      socket.emit("host:gameStarted", {
        gameId: data.id,
        gameName: data.name,
        date: data.date,
        hostingSiteId: data.hostingSite.id,
        hostingSiteName: data.hostingSite.name,
        hostingSiteLocation: data.hostingSite.location,        
        teams: data.teams,
        joined: false,
      });
      console.log('Signal Sent: host:gameStarted');
      // Refresh game data to reflect the new status
      setGame((prev) => prev && { ...prev, status: 'IN_PROGRESS' });
    } catch (error) {
      console.log('Error with Sending Signal: host:gameStarted');
      console.error('Error starting game:', error);
      alert('Failed to start the game.');
    }
  };

  const handleJoinGame = async () => {
    router.push(`/dashboard/host/${gameId}/play`)
  };

  const handleResetGame = async () => {
    if (confirm("Are you sure you want to reset this game? This action cannot be undone.")) {
      try {
        const response = await fetch("/api/host/debug/reset-game", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId }),
        });
  
        if (!response.ok) {
          throw new Error("Failed to reset the game.");
        }
  
        alert("Game reset successfully!");
      } catch (error) {
        console.error("Error resetting game:", error);
        alert("An error occurred while resetting the game.");
      }
    }
  };  

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!game) {
    return <div>Loading...</div>;
  }

  const formattedDate = new Date(game.date).toLocaleDateString('en-US', { timeZone: 'UTC' });

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h1 className="text-3xl font-semibold text-center mb-8">Game Setup: {game.name}</h1>
      <p className="text-lg">Date: {formattedDate}</p>
      <p className="text-lg">Hosting Site: {game.hostingSite.name}</p>

      {/* QR Code Section */}
      <div className="bg-gray-100 p-4 rounded-lg my-8 text-center">
        <h2 className="text-xl font-semibold mb-4">Game QR Code</h2>
        <QRCodeCanvas
          value={`http://localhost:3001/join/${gameId}`}
          size={200}
          className="mx-auto mb-4"
        />
        <button
          onClick={handleCopyToClipboard}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 mb-2"
        >
          Copy Game Link
        </button>
        {copySuccess && <p className="text-green-500 text-sm">Link copied to clipboard!</p>}
        <button
          onClick={handleSendEmail}
          className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600"
        >
          Send Link via Email
        </button>
        {/* Start Game Button */}
        <button
          onClick={handleStartGame}
          className={`mt-4 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 ${
            game?.status === 'IN_PROGRESS' ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={game?.status === 'IN_PROGRESS'}
        >
          {game?.status === 'IN_PROGRESS' ? 'Game Already Started' : 'Start Game'}
        </button>
        {/* Join Game Button */}
        <button
          onClick={handleJoinGame}
          className={`mt-4 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 ${
            game?.status === 'PENDING' ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={game?.status === 'PENDING'}
        >
          {game?.status === 'PENDING' ? 'Game Not Stated' : 'Join Game'}
        </button>
        {/* Reset Game Button */}
        <button
        onClick={handleResetGame}
        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 mt-4"
        >
            Reset Game
         </button>
      </div>

      {/* Render Teams */}
      <section className="mt-8">
        <h2 className="text-2xl font-semibold">Teams ({teams.length})</h2>
        <ul className="space-y-2 mt-4">
          {teams.map((team) => (
            <li key={team.id} className="flex justify-between bg-gray-100 p-2 rounded-lg">
              <span>{team.name}</span>
              <button
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                onClick={() => handleRemoveTeam(team.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Render Available Teams */}
      <section className="mt-8">
        <h2 className="text-2xl font-semibold">Add Existing Teams</h2>
        <ul className="space-y-2 mt-4">
          {availableTeams.length === 0 ? (
            <p className="text-gray-500">No available teams to add.</p>
          ) : (
            availableTeams.map((team) => (
              <li
                key={`available-${team.id}`}
                className="flex justify-between bg-gray-100 p-2 rounded-lg"
              >
                <span>{team.name}</span>
                <button
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                  onClick={() => handleAddExistingTeam(team.id)}
                >
                  Add Team
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

     {/* Rounds Section */}
<section className="mt-8">
  <div className="flex justify-between items-center">
    <h2 className="text-2xl font-semibold">Rounds ({rounds.length})</h2>
    {/* Add Round Button */}
    <button
      onClick={() => router.push(`/dashboard/host/${gameId}/add-round`)}
      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 focus:outline-none"
    >
      Add Round
    </button>
  </div>
  <ul className="space-y-2 mt-4">
    {rounds.length > 0 ? (
      rounds.map((round) => (
        <li key={round.id} className="bg-gray-100 p-4 rounded-lg flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">{round.name}</h3>
            <p className="text-sm text-gray-600">Type: {round.roundType}</p>
            <p className="text-sm text-gray-600">Point Style: {round.pointSystem}</p>
          </div>
          <button
            onClick={() => router.push(`/dashboard/host/${gameId}/edit-round/${round.id}`)}
            className="bg-yellow-500 text-white px-3 py-1 rounded-lg hover:bg-yellow-600 focus:outline-none"
          >
            Edit
          </button>
        </li>
      ))
    ) : (
      <p className="text-gray-500 mt-4">No rounds created yet. Click &apos;Add Round&apos; to start.</p>
    )}
  </ul>
</section>


    </div>
  );
}
