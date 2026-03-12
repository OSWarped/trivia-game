'use client';

import { formatScheduledFor } from '../lib/join-utils';

interface JoinStatusPanelProps {
  title: string;
  siteName: string | null;
  siteAddress?: string | null;
  scheduledFor: string | null;
  gameStatus: string;
  isJoinable: boolean;
  isAttemptingResume: boolean;
  approvalPending: boolean;
  approvalMessage: string;
  submitError: string;
  resumeError: string;
  selectedTeamName?: string | null;
}

function getStatusLabel(gameStatus: string): string {
  switch (gameStatus) {
    case 'LIVE':
      return 'Live now';
    case 'SCHEDULED':
      return 'Open for joining';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return gameStatus;
  }
}

export default function JoinStatusPanel({
  title,
  siteName,
  siteAddress,
  scheduledFor,
  gameStatus,
  isJoinable,
  isAttemptingResume,
  approvalPending,
  approvalMessage,
  submitError,
  resumeError,
  selectedTeamName,
}: JoinStatusPanelProps) {
  const scheduledLabel = formatScheduledFor(scheduledFor);
  const statusLabel = getStatusLabel(gameStatus);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/80">
            Join Game
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">{title}</h1>

          {siteName ? (
            <p className="mt-2 text-sm text-white/70">
              {siteName}
              {siteAddress ? ` • ${siteAddress}` : ''}
            </p>
          ) : null}

          <p className="mt-2 text-sm text-white/60">Scheduled: {scheduledLabel}</p>
        </div>

        <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white/80">
          {statusLabel}
        </div>
      </div>

      {!isJoinable ? (
        <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          This game is not currently open for joining.
        </div>
      ) : null}

      {isAttemptingResume ? (
        <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
          Restoring your team session…
        </div>
      ) : null}

      {selectedTeamName ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
          Selected team: <span className="font-semibold text-white">{selectedTeamName}</span>
        </div>
      ) : null}

      {approvalPending ? (
        <div className="mt-5 rounded-2xl border border-sky-300/20 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
          {approvalMessage || 'This team requires host approval before joining.'}
        </div>
      ) : null}

      {resumeError ? (
        <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          {resumeError}
        </div>
      ) : null}

      {submitError ? (
        <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {submitError}
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white/65">
        One device represents one team during live play. If your team needs to move to
        another device, the host can transfer it.
      </div>
    </div>
  );
}