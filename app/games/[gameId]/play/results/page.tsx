'use client';

import React, { JSX, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface AnswerResult {
  questionId: string;
  text: string;
  yourAnswer: string;
  isCorrect: boolean;
  pointsDelta: number;
  favorite: boolean;
}

interface ResultsData {
  game: {
    id: string;
    title: string;
    date: string;
    status: 'DRAFT' | 'LIVE' | 'CLOSED';
    rank?: number;
    totalTeams?: number;
  };
  team: { id: string; name: string; finalScore: number; rank?: number };
  answers: AnswerResult[];
  stats: {
    totalCorrect: number;
    avgPoints: number;
    maxGain: number;
    maxLoss: number;
    favoritesCount: number;
  };
}

export default function ResultsPage(): JSX.Element {
  const { gameId } = useParams() as { gameId: string };
  const teamId = typeof window !== 'undefined' ? localStorage.getItem('teamId') : null;
  const router = useRouter();

  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId || !teamId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/play/results?gameId=${gameId}&teamId=${teamId}`, {
          cache: 'no-store',
        });
        if (!res.ok) {
          console.error('Failed to load results', await res.text());
          setLoading(false);
          return;
        }
        const json = (await res.json()) as ResultsData;
        if (json.game.status !== 'CLOSED') {
          router.replace(`/app/games/${gameId}/play`);
          return;
        }
        setData(json);
      } catch (err) {
        console.error('Error fetching results:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [gameId, teamId, router]);

  if (loading) return <div className="p-6">Loading results…</div>;
  if (!data) return <div className="p-6 text-red-600">Results not available.</div>;

  const { game, team, answers, stats } = data;

  return (
    <div className="p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Final Results: {game.title}</h1>
        <p className="text-sm text-gray-500">{new Date(game.date).toLocaleString()}</p>
        <h2 className="mt-2 text-xl">Your Score: {team.finalScore} pts</h2>
        {team.rank != null && game.totalTeams != null && (
          <p className="text-gray-600">
            You placed <strong>{team.rank}</strong> of <strong>{game.totalTeams}</strong>
          </p>
        )}
      </header>

      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Question Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr>
                <th className="border px-2 py-1">#</th>
                <th className="border px-2 py-1 text-left">Question</th>
                <th className="border px-2 py-1 text-left">Your Answer</th>
                <th className="border px-2 py-1">Correct?</th>
                <th className="border px-2 py-1">Points Δ</th>
                <th className="border px-2 py-1">Favorite</th>
              </tr>
            </thead>
            <tbody>
              {answers.map((ans, idx) => (
                <tr key={ans.questionId} className="hover:bg-gray-50">
                  <td className="border px-2 py-1 text-center">{idx + 1}</td>
                  <td className="border px-2 py-1">{ans.text}</td>
                  <td className="border px-2 py-1">{ans.yourAnswer}</td>
                  <td className="border px-2 py-1 text-center">
                    {ans.isCorrect ? '✅' : '❌'}
                  </td>
                  <td className={`border px-2 py-1 text-center ${ans.pointsDelta > 0 ? 'text-green-600' : ans.pointsDelta < 0 ? 'text-red-600' : ''}`}>
                    {ans.pointsDelta > 0 ? '+' : ''}{ans.pointsDelta}
                  </td>
                  <td className="border px-2 py-1 text-center">
                    {ans.favorite ? '⭐︎' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 shadow rounded">
          <p className="text-sm text-gray-500">Correct Answers</p>
          <p className="text-xl font-bold">{stats.totalCorrect}</p>
        </div>
        <div className="bg-white p-4 shadow rounded">
          <p className="text-sm text-gray-500">Avg Points</p>
          <p className="text-xl font-bold">{stats.avgPoints.toFixed(1)}</p>
        </div>
        <div className="bg-white p-4 shadow rounded">
          <p className="text-sm text-gray-500">Biggest Gain</p>
          <p className="text-xl font-bold text-green-600">+{stats.maxGain}</p>
        </div>
        <div className="bg-white p-4 shadow rounded">
          <p className="text-sm text-gray-500">Biggest Loss</p>
          <p className="text-xl font-bold text-red-600">–{Math.abs(stats.maxLoss)}</p>
        </div>
      </section>

      {stats.favoritesCount > 0 && (
        <section className="mb-8">
          <h3 className="text-lg font-semibold mb-2">Host’s Favorites ({stats.favoritesCount})</h3>
          <ul className="list-disc list-inside">
            {answers.filter(a => a.favorite).map(a => (
              <li key={a.questionId} className="mb-1">
                Q{answers.indexOf(a) + 1}: “<em>{a.yourAnswer}</em>”
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="flex flex-wrap gap-4">
        <Link href="/leaderboard" className="btn">
          View Leaderboard
        </Link>
        <button className="btn">Download PDF</button>
        <Link href={`/app/games/${gameId}/play`} className="btn">
          Play Again
        </Link>
      </footer>
    </div>
  );
}
