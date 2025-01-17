'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';

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

    fetchGameData();
  }, [gameId]);

  const handleAddExistingTeam = async (teamId: string) => {
    try {
      const response = await fetch(`/api/host/games/${gameId}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      });

      if (!response.ok) throw new Error('Failed to add team.');

      const team = await response.json();
      setTeams((prev) => [...prev, team]);
      setAvailableTeams((prev) => prev.filter((t) => t.id !== teamId)); // Remove added team from available list
    } catch (err) {
      console.error('Error adding team:', err);
      setError('Failed to add existing team.');
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
      </div>

      {/* Teams Section */}
      <section className="mt-8">
        <h2 className="text-2xl font-semibold">Teams ({teams.length})</h2>
        <ul className="space-y-2 mt-4">
          {teams.map((team) => (
            <li key={team.id} className="flex justify-between bg-gray-100 p-2 rounded-lg">
              <span>{team.name}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Add Existing Teams */}
      <section className="mt-8">
        <h2 className="text-2xl font-semibold">Add Existing Teams</h2>
        <ul className="space-y-2 mt-4">
          {availableTeams.length === 0 ? (
            <p className="text-gray-500">No available teams to add.</p>
          ) : (
            availableTeams.map((team) => (
              <li key={team.id} className="flex justify-between bg-gray-100 p-2 rounded-lg">
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
        <h2 className="text-2xl font-semibold">Rounds ({rounds.length})</h2>
        <ul className="space-y-2 mt-4">
          {rounds.map((round) => (
            <li key={round.id} className="bg-gray-100 p-2 rounded-lg">
              <h3 className="text-lg">{round.name}</h3>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
