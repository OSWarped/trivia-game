// File: app/dashboard/host/[gameId]/play/components/TeamSidebar.tsx
'use client';

import React, { JSX } from 'react';
import type { HostTeamStatus, TeamTransferMode } from '../types/host-play.types';
import TeamSidebarCard from './TeamSidebarCard';

interface TeamSidebarProps {
  teamStatus: HostTeamStatus[];
  onRequestLiveTeams: () => void;
  onRevokeSession: (teamId: string) => Promise<void>;
  onUnlockSession: (teamId: string) => Promise<void>;
  onResetPin: (teamId: string) => Promise<string>;
  onSetTeamTransferMode: (
    teamId: string,
    mode: TeamTransferMode
  ) => Promise<void>;
  onApproveJoinRequest: (teamId: string) => Promise<void>;
  onDenyJoinRequest: (teamId: string) => Promise<void>;
  onBootTeam: (teamId: string) => Promise<void>;
}

function summaryPill(
  label: string,
  count: number,
  tone: 'slate' | 'amber' | 'rose' | 'blue'
): JSX.Element {
  const toneClasses: Record<typeof tone, string> = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
  };

  return (
    <div
      className={`rounded-2xl border px-3 py-2 text-xs font-semibold shadow-sm ${toneClasses[tone]}`}
    >
      <div className="uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-1 text-lg leading-none">{count}</div>
    </div>
  );
}

function isFlaggedTeam(team: HostTeamStatus): boolean {
  return (
    team.highConcernThisQuestion === true ||
    team.activitySeverity === 'MEDIUM' ||
    team.activitySeverity === 'HIGH'
  );
}

export default function TeamSidebar({
  teamStatus,
  onRequestLiveTeams,
  onRevokeSession,
  onUnlockSession,
  onResetPin,
  onSetTeamTransferMode,
  onApproveJoinRequest,
  onDenyJoinRequest,
  onBootTeam,
}: TeamSidebarProps) {
  const awayCount = React.useMemo(
    () => teamStatus.filter((team) => team.isInactiveNow).length,
    [teamStatus]
  );

  const flaggedCount = React.useMemo(
    () => teamStatus.filter(isFlaggedTeam).length,
    [teamStatus]
  );

  const approvalNeededCount = React.useMemo(
    () => teamStatus.filter((team) => team.hasPendingApproval).length,
    [teamStatus]
  );

  const lockedCount = React.useMemo(
    () => teamStatus.filter((team) => team.transferMode === 'LOCKED').length,
    [teamStatus]
  );

  return (
    <aside className="hidden h-screen w-[22rem] shrink-0 border-r border-white/10 bg-white/70 p-4 shadow-xl backdrop-blur-sm md:flex md:flex-col">
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Session Oversight
            </div>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              Team Sessions
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Review team activity, join requests, and rejoin controls.
            </p>
          </div>

          <button
            onClick={onRequestLiveTeams}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {summaryPill('Away', awayCount, awayCount > 0 ? 'amber' : 'slate')}
          {summaryPill(
            'Review Activity',
            flaggedCount,
            flaggedCount > 0 ? 'rose' : 'slate'
          )}
          {summaryPill(
            'Approval Needed',
            approvalNeededCount,
            approvalNeededCount > 0 ? 'blue' : 'slate'
          )}
          {summaryPill(
            'Locked by Host',
            lockedCount,
            lockedCount > 0 ? 'rose' : 'slate'
          )}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pb-24 pr-1">
        {teamStatus.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-4 py-8 text-center shadow-sm">
            <div className="text-sm font-semibold text-slate-900">
              No team sessions yet
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Teams will appear here as they join the game.
            </p>
          </div>
        ) : (
          teamStatus.map((team) => (
            <TeamSidebarCard
              key={team.id}
              team={team}
              onRevokeSession={onRevokeSession}
              onUnlockSession={onUnlockSession}
              onResetPin={onResetPin}
              onSetTeamTransferMode={onSetTeamTransferMode}
              onApproveJoinRequest={onApproveJoinRequest}
              onDenyJoinRequest={onDenyJoinRequest}
              onBootTeam={onBootTeam}
            />
          ))
        )}
      </div>
    </aside>
  );
}