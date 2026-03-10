'use client';

import React from 'react';
import type { GameRow } from '../types/workspace.types';
import { formatDateTime } from '../utils/workspace.helpers';
import SectionCard from './ui/SectionCard';
import ToolbarButton from './ui/ToolbarButton';

interface GamesPanelProps {
  games: GameRow[];
  onOpenDetails: (game: GameRow) => void;
  onEdit: (game: GameRow) => void | Promise<void>;
  onDelete: (game: GameRow) => void | Promise<void>;
}

export default function GamesPanel({
  games,
  onOpenDetails,
  onEdit,
  onDelete,
}: GamesPanelProps) {
  return (
    <SectionCard
      title="Games"
      subtitle="Search, inspect, and edit games across all sites."
    >
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              <th className="px-3 py-2">Game</th>
              <th className="px-3 py-2">Site</th>
              <th className="px-3 py-2">Event</th>
              <th className="px-3 py-2">Season</th>
              <th className="px-3 py-2">Scheduled For</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Host</th>
              <th className="px-3 py-2">Join Code</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => (
              <tr key={game.id} className="bg-slate-50 text-sm text-slate-800">
                <td className="rounded-l-xl px-3 py-3 font-medium">
                  {game.title}
                </td>
                <td className="px-3 py-3">{game.siteName}</td>
                <td className="px-3 py-3">{game.eventName}</td>
                <td className="px-3 py-3">{game.seasonName}</td>
                <td className="px-3 py-3">
                  {formatDateTime(game.scheduledFor)}
                </td>
                <td className="px-3 py-3">{game.status}</td>
                <td className="px-3 py-3">{game.hostName ?? 'Unassigned'}</td>
                <td className="px-3 py-3">{game.joinCode ?? '—'}</td>
                <td className="rounded-r-xl px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    <ToolbarButton
                      label="Details"
                      onClick={() => onOpenDetails(game)}
                    />
                    <ToolbarButton
                      label="Edit"
                      onClick={() => void onEdit(game)}
                    />
                    <ToolbarButton
                      label="Delete"
                      onClick={() => void onDelete(game)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {games.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
            No games matched your filters.
          </div>
        )}
      </div>
    </SectionCard>
  );
}