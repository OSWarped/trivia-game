'use client';

import React, { useMemo, useState } from 'react';
import type { HostTeamStatus } from '../types/host-play.types';
import TeamSidebarCard from './TeamSidebarCard';

interface TeamDrawerProps {
  teamStatus: HostTeamStatus[];
  onRequestLiveTeams: () => void;
  onRevokeSession: (teamId: string) => Promise<void>;
  onUnlockSession: (teamId: string) => Promise<void>;
}

export default function TeamDrawer({
  teamStatus,
  onRequestLiveTeams,
  onRevokeSession,
  onUnlockSession,
}: TeamDrawerProps) {
  const [open, setOpen] = useState(false);

  const summary = useMemo(() => {
    const activeCount = teamStatus.filter(
      (team) => team.connectionState === 'ACTIVE'
    ).length;
    const lockedCount = teamStatus.filter(
      (team) => team.transferMode === 'LOCKED'
    ).length;

    return {
      total: teamStatus.length,
      active: activeCount,
      locked: lockedCount,
    };
  }, [teamStatus]);

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-6px_20px_rgba(0,0,0,0.08)] backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.99]"
          >
            Teams ({summary.total})
          </button>

          <button
            onClick={onRequestLiveTeams}
            className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-[0.99]"
          >
            Refresh
          </button>
        </div>

        <div className="mt-2 flex items-center gap-2 px-1 text-[11px] text-gray-500">
          <span>{summary.active} active</span>
          <span>•</span>
          <span>{summary.locked} locked</span>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-50 md:hidden ${
          open ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        aria-hidden={!open}
      >
        <div
          className={`absolute inset-0 bg-black/35 transition-opacity duration-300 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setOpen(false)}
        />

        <div
          className={`absolute inset-x-0 bottom-0 max-h-[82vh] rounded-t-[1.75rem] border-t border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100 shadow-2xl transition-transform duration-300 ${
            open ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="sticky top-0 z-10 rounded-t-[1.75rem] border-b border-gray-200 bg-white/90 px-4 pb-3 pt-3 backdrop-blur">
            <div className="mb-3 flex justify-center">
              <div className="h-1.5 w-12 rounded-full bg-gray-300" />
            </div>

            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Team Control</h2>
                <p className="mt-1 text-xs text-gray-500">
                  Status, locks, and live team activity
                </p>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
              >
                Close
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full bg-white px-3 py-1 font-medium text-gray-600 shadow-sm">
                {summary.total} teams
              </span>
              <span className="rounded-full bg-green-100 px-3 py-1 font-medium text-green-800">
                {summary.active} active
              </span>
              <span className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-800">
                {summary.locked} locked
              </span>
            </div>
          </div>

          <div className="overflow-y-auto px-4 pb-28 pt-4">
            {teamStatus.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white/80 p-8 text-center shadow-sm">
                <div className="text-sm font-medium text-gray-700">
                  No teams to display
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Teams will appear here once they join the game.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {teamStatus.map((team) => (
                  <TeamSidebarCard
                    key={team.id}
                    team={team}
                    onRevokeSession={onRevokeSession}
                    onUnlockSession={onUnlockSession}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}