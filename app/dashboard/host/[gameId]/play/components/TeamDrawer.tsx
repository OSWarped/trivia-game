// File: app/dashboard/host/[gameId]/play/components/TeamDrawer.tsx
'use client';

import React, { JSX, useMemo, useState } from 'react';
import type { HostTeamStatus, TeamTransferMode } from '../types/host-play.types';
import TeamSidebarCard from './TeamSidebarCard';

interface TeamDrawerProps {
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

export default function TeamDrawer({
  teamStatus,
  onRequestLiveTeams,
  onRevokeSession,
  onUnlockSession,
  onResetPin,
  onSetTeamTransferMode,
  onApproveJoinRequest,
  onDenyJoinRequest,
  onBootTeam,
}: TeamDrawerProps) {
  const [open, setOpen] = useState(false);

  const summary = useMemo(() => {
    const activeCount = teamStatus.filter(
      (team) => team.connectionState === 'ACTIVE'
    ).length;

    const awayCount = teamStatus.filter((team) => team.isInactiveNow).length;

    const flaggedCount = teamStatus.filter(isFlaggedTeam).length;

    const approvalNeededCount = teamStatus.filter(
      (team) => team.hasPendingApproval
    ).length;

    const lockedCount = teamStatus.filter(
      (team) => team.transferMode === 'LOCKED'
    ).length;

    return {
      total: teamStatus.length,
      active: activeCount,
      away: awayCount,
      flagged: flaggedCount,
      approvalNeeded: approvalNeededCount,
      locked: lockedCount,
    };
  }, [teamStatus]);

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-white/80 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-10px_30px_rgba(0,0,0,0.10)] backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99]"
          >
            Team Sessions ({summary.total})
          </button>

          <button
            onClick={onRequestLiveTeams}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99]"
          >
            Refresh
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 px-1 text-[11px] text-slate-500">
          <span>{summary.active} active</span>
          <span>•</span>
          <span>{summary.away} away</span>
          <span>•</span>
          <span>{summary.flagged} flagged</span>
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
          className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setOpen(false)}
        />

        <div
          className={`absolute inset-x-0 bottom-0 max-h-[82vh] rounded-t-[1.75rem] border-t border-white/10 bg-white/85 shadow-2xl backdrop-blur-sm transition-transform duration-300 ${
            open ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="sticky top-0 z-10 rounded-t-[1.75rem] border-b border-slate-200 bg-white/90 px-4 pb-4 pt-3 backdrop-blur">
            <div className="mb-3 flex justify-center">
              <div className="h-1.5 w-12 rounded-full bg-slate-300" />
            </div>

            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Session Oversight
                </div>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">
                  Team Sessions
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Review team activity, join requests, and rejoin controls.
                </p>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {summaryPill('Away', summary.away, summary.away > 0 ? 'amber' : 'slate')}
              {summaryPill(
                'Review Activity',
                summary.flagged,
                summary.flagged > 0 ? 'rose' : 'slate'
              )}
              {summaryPill(
                'Approval Needed',
                summary.approvalNeeded,
                summary.approvalNeeded > 0 ? 'blue' : 'slate'
              )}
              {summaryPill(
                'Locked by Host',
                summary.locked,
                summary.locked > 0 ? 'rose' : 'slate'
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-600 shadow-sm">
                {summary.total} teams
              </span>
              <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                {summary.active} active
              </span>
              <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 font-medium text-amber-700">
                {summary.away} away
              </span>
              <span className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1 font-medium text-rose-700">
                {summary.flagged} flagged
              </span>
            </div>
          </div>

          <div className="overflow-y-auto px-4 pb-28 pt-4">
            {teamStatus.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center shadow-sm">
                <div className="text-sm font-medium text-slate-900">
                  No team sessions yet
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Teams will appear here as they join the game.
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
                    onResetPin={onResetPin}
                    onSetTeamTransferMode={onSetTeamTransferMode}
                    onApproveJoinRequest={onApproveJoinRequest}
                    onDenyJoinRequest={onDenyJoinRequest}
                    onBootTeam={onBootTeam}
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