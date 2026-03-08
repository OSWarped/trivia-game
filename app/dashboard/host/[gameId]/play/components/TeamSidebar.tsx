'use client';

import React from 'react';
import type { HostTeamStatus } from '../types/host-play.types';
import TeamSidebarCard from './TeamSidebarCard';

interface TeamSidebarProps {
  teamStatus: HostTeamStatus[];
  onRequestLiveTeams: () => void;
  onRevokeSession: (teamId: string) => Promise<void>;
  onUnlockSession: (teamId: string) => Promise<void>;
}

export default function TeamSidebar({
  teamStatus,
  onRequestLiveTeams,
  onRevokeSession,
  onUnlockSession,
}: TeamSidebarProps) {
  return (
    <aside className="hidden w-[22rem] border-r border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100 p-4 shadow-inner md:block">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">👥 Teams</h2>
          <p className="mt-1 text-xs text-gray-500">
            Live team control and status
          </p>
        </div>

        <button
          onClick={onRequestLiveTeams}
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      <div className="max-h-[calc(100vh-7rem)] space-y-3 overflow-y-auto pr-1">
        {teamStatus.map((team) => (
          <TeamSidebarCard
            key={team.id}
            team={team}
            onRevokeSession={onRevokeSession}
            onUnlockSession={onUnlockSession}
          />
        ))}
      </div>
    </aside>
  );
}