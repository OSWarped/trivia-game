'use client';

import React from 'react';
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
  return (
    <aside className="hidden h-screen w-[22rem] shrink-0 border-r border-white/10 bg-white/70 p-4 shadow-xl backdrop-blur-sm md:flex md:flex-col">
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
           
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Teams</h2>
            
          </div>

          <button
            onClick={onRequestLiveTeams}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1 pb-24">
        {teamStatus.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-4 py-8 text-center shadow-sm">
            <div className="text-sm font-semibold text-slate-900">
              No teams yet
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Joined teams will appear here for host control.
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