'use client';

import React from 'react';
import type { HostTeamStatus } from '../types/host-play.types';

interface TeamStatusBadgesProps {
  team: HostTeamStatus;
}

function badgeBase(classes: string): string {
  return `inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${classes}`;
}

function getConnectionBadge(connectionState?: HostTeamStatus['connectionState']) {
  switch (connectionState) {
    case 'ACTIVE':
      return {
        label: 'Active',
        className: badgeBase('border-emerald-300 bg-emerald-50 text-emerald-700'),
      };
    case 'RECONNECTING':
      return {
        label: 'Reconnecting',
        className: badgeBase('border-amber-300 bg-amber-50 text-amber-700'),
      };
    case 'OFFLINE':
      return {
        label: 'Offline',
        className: badgeBase('border-slate-300 bg-slate-100 text-slate-700'),
      };
    case 'PENDING_TRANSFER':
      return {
        label: 'Pending Transfer',
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
        label: 'Host Approval',
        className: badgeBase('border-blue-300 bg-blue-50 text-blue-700'),
      };
    case 'LOCKED':
      return {
        label: 'Locked',
        className: badgeBase('border-rose-300 bg-rose-50 text-rose-700'),
      };
    default:
      return null;
  }
}

export default function TeamStatusBadges({ team }: TeamStatusBadgesProps) {
  const connectionBadge = getConnectionBadge(team.connectionState);
  const transferModeBadge = getTransferModeBadge(team.transferMode);

  return (
    <div className="flex flex-wrap gap-2">
      {connectionBadge ? (
        <span className={connectionBadge.className}>{connectionBadge.label}</span>
      ) : null}

      {team.submitted ? (
        <span className={badgeBase('border-emerald-300 bg-emerald-50 text-emerald-700')}>
          Submitted
        </span>
      ) : null}

      {transferModeBadge ? (
        <span className={transferModeBadge.className}>
          {transferModeBadge.label}
        </span>
      ) : null}

      {team.hasPendingApproval ? (
        <span className={badgeBase('border-amber-300 bg-amber-50 text-amber-700')}>
          Pending Approval
        </span>
      ) : null}

      {team.hasDispute ? (
        <span className={badgeBase('border-rose-300 bg-rose-50 text-rose-700')}>
          Dispute
        </span>
      ) : null}
    </div>
  );
}