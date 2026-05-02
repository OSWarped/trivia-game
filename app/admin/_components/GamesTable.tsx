import Link from 'next/link';
import type { GameRow } from '../_lib/types';
import { formatDateTime } from '../_lib/utils';
import StatusBadge from './StatusBadge';

interface GamesTableProps {
  games: GameRow[];
  emptyMessage?: string;
}

export default function GamesTable({
  games,
  emptyMessage = 'No games matched the current filters.',
}: GamesTableProps) {
  if (games.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-y-2">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Game</th>
            <th className="px-3 py-2">Location</th>
            <th className="px-3 py-2">Trivia Night</th>
            <th className="px-3 py-2">Season</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Host</th>
            <th className="px-3 py-2">Join Code</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {games.map((game) => (
            <tr key={game.id} className="bg-slate-50 text-sm text-slate-800">
              <td className="rounded-l-2xl px-3 py-3 text-slate-600">
                {formatDateTime(game.scheduledFor)}
              </td>
              <td className="px-3 py-3 font-medium text-slate-900">{game.title}</td>
              <td className="px-3 py-3 text-slate-600">{game.siteName}</td>
              <td className="px-3 py-3 text-slate-600">{game.eventName}</td>
              <td className="px-3 py-3 text-slate-600">{game.seasonName}</td>
              <td className="px-3 py-3">
                <StatusBadge status={game.status} />
              </td>
              <td className="px-3 py-3 text-slate-600">{game.hostName ?? 'Unassigned'}</td>
              <td className="px-3 py-3 text-slate-600">{game.joinCode ?? '—'}</td>
              <td className="rounded-r-2xl px-3 py-3">
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/games/${game.id}`}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Open
                  </Link>
                  <Link
                    href={`/admin/games/${game.id}/editor`}
                    className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-800"
                  >
                    Edit Content
                  </Link>
                  <Link
                    href={`/dashboard/host/${game.id}/command`}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Host View
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
