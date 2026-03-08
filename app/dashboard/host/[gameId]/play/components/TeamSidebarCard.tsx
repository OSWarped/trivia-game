'use client';

import React from 'react';
import type { HostTeamStatus } from '../types/host-play.types';
import TeamStatusBadges from './TeamStatusBadges';

interface TeamSidebarCardProps {
  team: HostTeamStatus;
  onRevokeSession: (teamId: string) => Promise<void>;
  onUnlockSession: (teamId: string) => Promise<void>;
}

function getCardAccentClasses(team: HostTeamStatus): string {
  if (team.transferMode === 'LOCKED') {
    return 'border-red-200 bg-red-50/60';
  }

  switch (team.connectionState) {
    case 'ACTIVE':
      return 'border-green-200 bg-white';
    case 'RECONNECTING':
      return 'border-yellow-200 bg-yellow-50/40';
    case 'OFFLINE':
      return 'border-gray-200 bg-white';
    case 'PENDING_TRANSFER':
      return 'border-orange-200 bg-orange-50/40';
    default:
      return 'border-gray-200 bg-white';
  }
}

function getScorePillClasses(team: HostTeamStatus): string {
  if (team.transferMode === 'LOCKED') {
    return 'bg-red-100 text-red-700';
  }

  return 'bg-blue-50 text-blue-700';
}

export default function TeamSidebarCard({
  team,
  onRevokeSession,
  onUnlockSession,
}: TeamSidebarCardProps) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm transition hover:shadow-md ${getCardAccentClasses(
        team
      )}`}
    >
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="line-clamp-2 break-words text-[15px] font-semibold leading-5 text-gray-900">
              {team.name}
            </div>

            <div className="mt-1 text-xs text-gray-500">Team</div>
          </div>

          <div
            className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${getScorePillClasses(
              team
            )}`}
          >
            {team.score ?? 0} pts
          </div>
        </div>

        <div className="rounded-xl bg-white/70 p-2">
          <TeamStatusBadges team={team} />
        </div>

        <div className="flex items-center justify-end border-t border-black/5 pt-3">
          {team.transferMode === 'LOCKED' ? (
            <button
              onClick={() => void onUnlockSession(team.id)}
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              Unlock Team
            </button>
          ) : (
            <button
              onClick={() => void onRevokeSession(team.id)}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
            >
              Revoke + Lock
            </button>
          )}
        </div>
      </div>
    </div>
  );
}