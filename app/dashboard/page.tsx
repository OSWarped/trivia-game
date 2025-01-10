'use client';

import { useEffect, useState } from 'react';

interface Team {
  id: string;
  name: string;
  games: Game[];
}

interface Game {
  id: string;
  name: string;
  date: string;
}

export default function UserDashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchTeamsAndGames = async () => {
      try {
        // Fetch teams the user is associated with
       // const token = localStorage.getItem('authToken'); // Assuming the token is stored in localStorage
        const teamsRes = await fetch('/api/teams/player', {
          method: 'GET',
          credentials: 'include', // Include cookies with the request
        });
        const teamsData: Team[] = await teamsRes.json();

        if (!teamsRes.ok) {
          throw new Error('Failed to fetch teams');
        }

        // Fetch upcoming games for each team
        const enrichedTeams = await Promise.all(
          teamsData.map(async (team) => {
            const gamesRes = await fetch(`/api/teams/${team.id}/games`);
            const gamesData: Game[] = await gamesRes.json();

            if (!gamesRes.ok) {
              throw new Error(`Failed to fetch games for team ${team.id}`);
            }

            return { ...team, games: gamesData };
          })
        );

        setTeams(enrichedTeams);
      } catch (err) {
        console.error('Error fetching teams or games:', err);
        setError('Something went wrong while fetching your teams and games.');
      }
    };

    fetchTeamsAndGames();
  }, []);

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  if (teams.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
        <h1 className="text-3xl font-semibold text-center mb-8">Your Dashboard</h1>
        <p>You are not currently associated with any teams. Contact your game host to join a team.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h1 className="text-3xl font-semibold text-center mb-8">Your Dashboard</h1>

      {teams.map((team) => (
        <div key={team.id} className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">{team.name}</h2>

          {team.games.length > 0 ? (
            <ul className="space-y-2">
              {team.games.map((game) => (
                <li key={game.id} className="bg-gray-100 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-semibold">{game.name}</h3>
                      <p className="text-sm text-gray-600">
                        {new Date(game.date).toLocaleDateString('en-US', {
                          timeZone: 'UTC',
                        })}
                      </p>
                    </div>
                    <button
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                      onClick={() => window.location.href = `/join/${game.id}`}
                    >
                      Join Game
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>No upcoming games for this team.</p>
          )}
        </div>
      ))}
    </div>
  );
}
