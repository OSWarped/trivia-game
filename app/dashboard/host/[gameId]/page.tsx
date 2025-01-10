'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation'; // Correct import for Next.js 15+
import { QRCodeCanvas } from 'qrcode.react'; // Import QR code library

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
  host: {
    name: string;
  };
  status: string; // Track game status (e.g., "PENDING", "STARTED")
}

interface Round {
  id: string;
  name: string;
  roundType: string;
}

interface Team {
  id: string;
  name: string;
}

export default function GameSetup() {
  const { gameId } = useParams(); // Get the gameId from the URL params
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [teams, setTeams] = useState<Team[]>([]); // List of teams
  const [newTeamName, setNewTeamName] = useState('');
  const [error, setError] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false); // For copy-to-clipboard feedback

  useEffect(() => {
    if (!gameId) return; // Don't run if the gameId is not yet available

    const fetchGameData = async () => {
      try {
        // Fetch game data
        const gameRes = await fetch(`/api/host/games/${gameId}`);
        const gameData = await gameRes.json();

        if (gameData.error) {
          setError(gameData.error);
          return;
        }

        setGame(gameData); // Game data

        // Fetch rounds for the game
        const roundsRes = await fetch(`/api/host/games/${gameId}/rounds`);
        const roundsData = await roundsRes.json();
        setRounds(roundsData); // Set rounds data

        // Fetch teams for the game
        const teamsRes = await fetch(`/api/host/games/${gameId}/teams`);
        const teamsData = await teamsRes.json();
        setTeams(teamsData); // Set teams data
      } catch (err) {
        console.error('Error fetching game, rounds, or teams:', err);
        setError('Something went wrong while fetching game data.');
      }
    };

    fetchGameData();
  }, [gameId]);

  const handleCopyToClipboard = () => {
    const gameLink = `http://localhost:3001/join/${gameId}`; // Replace with your production link
    navigator.clipboard.writeText(gameLink).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); // Reset after 2 seconds
    });
  };

  const handleSendEmail = async () => {
    try {
      const email = prompt('Enter the recipient\'s email address:');
      if (!email) return;

      const gameLink = `http://localhost:3001/join/${gameId}`; // Replace with your production link

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
    if (!confirm('Are you sure you want to start this game? Once started, it cannot be paused.')) {
      return;
    }

    try {
      const response = await fetch(`/api/host/games/${gameId}/start`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to start the game');
      }

      alert('The game has been started successfully!');
      router.push(`/dashboard/host/${gameId}/play`);
    } catch (error) {
      console.error('Error starting the game:', error);
      alert('Failed to start the game.');
    }
  };

  const handleAddTeam = async () => {
    if (!newTeamName.trim()) return alert('Team name cannot be empty.');

    try {
      const response = await fetch(`/api/host/games/${gameId}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeamName }),
      });

      if (!response.ok) {
        throw new Error('Failed to add team');
      }

      const team = await response.json();
      setTeams((prev) => [...prev, team]); // Add the new team to the list
      setNewTeamName(''); // Reset the input field
    } catch (error) {
      console.error('Error adding team:', error);
      alert('Failed to add team.');
    }
  };

  if (error) {
    return <div className="text-red-600">{error}</div>; // Softer error color
  }

  if (!game) {
    return <div>Loading...</div>;
  }

  // Ensure the date is properly displayed as MM/DD/YYYY, adjusting for timezone
  const formattedDate = new Date(game.date).toLocaleDateString('en-US', {
    timeZone: 'UTC', // Make sure we display the date correctly
  });

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h1 className="text-3xl font-semibold text-center mb-8">Game Setup for {game.name}</h1>

      <p className="text-lg">Date: {formattedDate}</p>
      <p className="text-lg">Hosting Site: {game.hostingSite.name}</p>

      {/* QR Code Section */}
      <div className="bg-gray-100 p-4 rounded-lg my-8">
        <h2 className="text-xl font-semibold mb-4">Game QR Code</h2>
        <div className="flex flex-col items-center">
          <QRCodeCanvas value={`http://localhost:3001/join/${gameId}`} size={200} className="mb-4" />
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
        </div>
      </div>

      {/* Start Game or Go to Interface */}
      <div className="mt-6">
        {game.status === 'IN_PROGRESS' ? (
          <button
            onClick={() => router.push(`/dashboard/host/${gameId}/play`)}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
          >
            Go to Game Interface
          </button>
        ) : (
          <button
            onClick={handleStartGame}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
          >
            Start Game
          </button>
        )}
      </div>

      {/* Teams Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold">Teams</h2>
        <ul className="space-y-2 mt-4">
          {teams.map((team) => (
            <li key={team.id} className="bg-gray-100 p-2 rounded-lg">
              {team.name}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center space-x-4">
          <input
            type="text"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="New Team Name"
            className="border p-2 rounded-lg flex-1"
          />
          <button
            onClick={handleAddTeam}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Add Team
          </button>
        </div>
      </div>

      {/* Rounds Section */}
      <h2 className="text-2xl mt-8">Rounds</h2>
      {rounds.length === 0 ? (
        <div>
          <p>No rounds have been created yet.</p>
        </div>
      ) : (
        <ul className="space-y-4 mt-4">
          {rounds.map((round) => (
            <li key={round.id} className="my-4 bg-gray-100 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold">{round.name}</h3>
                  <p className="text-sm text-gray-600">{round.roundType}</p>
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={() => router.push(`/dashboard/host/${gameId}/rounds/${round.id}`)}
                    className="text-blue-500 hover:text-blue-600"
                  >
                    View Round Details
                  </button>
                  <button
                    onClick={() => router.push(`/dashboard/host/${gameId}/rounds/${round.id}/questions`)}
                    className="text-blue-500 hover:text-blue-600"
                  >
                    Edit Questions
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Always show the Add Round button */}
      <div className="mt-6">
        <button
          onClick={() => router.push(`/dashboard/host/${gameId}/add-round`)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add Round
        </button>
      </div>
    </div>
  );
}
