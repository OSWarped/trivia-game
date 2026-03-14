// File: app/dashboard/host/[gameId]/play/components/TeamStatusBadges.tsx
'use client';

import type { HostTeamStatus } from '../types/host-play.types';

interface TeamStatusBadgesProps {
  team: HostTeamStatus;
}

function badgeBase(classes: string): string {
  return `inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${classes}`;
}

function formatDurationShort(durationMs?: number): string {
  if (!durationMs || durationMs <= 0) {
    return '0s';
  }

  const totalSeconds = Math.floor(durationMs / 1000);

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes < 60) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function getConnectionBadge(team: HostTeamStatus) {
  switch (team.connectionState) {
    case 'ACTIVE':
      return {
        label: 'Active',
        className: badgeBase('border-emerald-300 bg-emerald-50 text-emerald-700'),
      };
    case 'RECONNECTING':
      // When the team is currently away, the timed Away badge is the
      // primary status signal. Skip the generic reconnecting badge to
      // avoid duplicate "Away" wording.
      if (team.isInactiveNow) {
        return null;
      }

      return {
        label: 'Rejoining',
        className: badgeBase('border-amber-300 bg-amber-50 text-amber-700'),
      };
    case 'OFFLINE':
      return {
        label: 'Disconnected',
        className: badgeBase('border-slate-300 bg-slate-100 text-slate-700'),
      };
    case 'PENDING_TRANSFER':
      return {
        label: 'Transfer Pending',
        className: badgeBase('border-orange-300 bg-orange-50 text-orange-700'),
      };
    default:
      return null;
  }
}

function getTransferModeBadge(transferMode?: HostTeamStatus['transferMode']) {
  switch (transferMode) {
    case 'HOST_APPROVAL':
      return {
        label: 'Approval Required',
        className: badgeBase('border-blue-300 bg-blue-50 text-blue-700'),
      };
    case 'LOCKED':
      return {
        label: 'Locked by Host',
        className: badgeBase('border-rose-300 bg-rose-50 text-rose-700'),
      };
    default:
      return null;
  }
}

function getActivitySeverityBadge(team: HostTeamStatus) {
  if (team.activitySeverity === 'HIGH' || team.highConcernThisQuestion) {
    return {
      label: 'Review Activity',
      className: badgeBase('border-rose-300 bg-rose-50 text-rose-700'),
    };
  }

  if (team.activitySeverity === 'MEDIUM') {
    return {
      label: 'Activity Watch',
      className: badgeBase('border-amber-300 bg-amber-50 text-amber-700'),
    };
  }

  if (team.activitySeverity === 'LOW' && !team.isInactiveNow) {
    return {
      label: 'Activity Logged',
      className: badgeBase('border-slate-300 bg-slate-50 text-slate-700'),
    };
  }

  return null;
}

function getAwayBadge(team: HostTeamStatus) {
  if (!team.isInactiveNow) {
    return null;
  }

  return {
    label: `Away ${formatDurationShort(team.inactiveDurationMsCurrent)}`,
    className: badgeBase('border-orange-300 bg-orange-50 text-orange-700'),
  };
}

function hasExcusedRecentEvent(team: HostTeamStatus): boolean {
  if (!team.recentActivityEvents || team.recentActivityEvents.length === 0) {
    return false;
  }

  return team.recentActivityEvents.some((event) => event.excused);
}

export default function TeamStatusBadges({ team }: TeamStatusBadgesProps) {
  const connectionBadge = getConnectionBadge(team);
  const transferModeBadge = getTransferModeBadge(team.transferMode);
  const activitySeverityBadge = getActivitySeverityBadge(team);
  const awayBadge = getAwayBadge(team);
  const showExcusedBadge = hasExcusedRecentEvent(team);

  return (
    <div className="flex flex-wrap gap-2">
      {awayBadge ? (
        <span className={awayBadge.className}>{awayBadge.label}</span>
      ) : null}

      {connectionBadge ? (
        <span className={connectionBadge.className}>{connectionBadge.label}</span>
      ) : null}

      {activitySeverityBadge ? (
        <span className={activitySeverityBadge.className}>
          {activitySeverityBadge.label}
        </span>
      ) : null}

      {team.inactiveBeforeSubmission ? (
        <span className={badgeBase('border-red-300 bg-red-50 text-red-700')}>
          Away Before Submission
        </span>
      ) : null}

      {team.submitted ? (
        <span className={badgeBase('border-emerald-300 bg-emerald-50 text-emerald-700')}>
          Answer Submitted
        </span>
      ) : null}

      {transferModeBadge ? (
        <span className={transferModeBadge.className}>
          {transferModeBadge.label}
        </span>
      ) : null}

      {team.hasPendingApproval ? (
        <span className={badgeBase('border-amber-300 bg-amber-50 text-amber-700')}>
          Join Request Pending
        </span>
      ) : null}

      {team.hasDispute ? (
        <span className={badgeBase('border-rose-300 bg-rose-50 text-rose-700')}>
          Ownership Dispute
        </span>
      ) : null}

      {showExcusedBadge ? (
        <span className={badgeBase('border-sky-300 bg-sky-50 text-sky-700')}>
          Excused by Host
        </span>
      ) : null}
    </div>
  );
}