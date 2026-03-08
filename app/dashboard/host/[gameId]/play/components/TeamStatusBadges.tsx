'use client';

import React from 'react';
import type { HostTeamStatus } from '../types/host-play.types';

interface TeamStatusBadgesProps {
  team: HostTeamStatus;
}

function badgeBase(classes: string): string {
  return `inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${classes}`;
}

function getConnectionBadge(connectionState?: HostTeamStatus['connectionState']) {
  switch (connectionState) {
    case 'ACTIVE':
      return {
        label: 'Active',
        className: badgeBase('bg-green-100 text-green-800'),
      };
    case 'RECONNECTING':
      return {
        label: 'Reconnecting',
        className: badgeBase('bg-yellow-100 text-yellow-800'),
      };
    case 'OFFLINE':
      return {
        label: 'Offline',
        className: badgeBase('bg-gray-200 text-gray-700'),
      };
    case 'PENDING_TRANSFER':
      return {
        label: 'Pending Transfer',
        className: badgeBase('bg-orange-100 text-orange-800'),
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
        className: badgeBase('bg-blue-100 text-blue-800'),
      };
    case 'LOCKED':
      return {
        label: 'Locked',
        className: badgeBase('bg-red-100 text-red-800'),
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
        <span className={badgeBase('bg-emerald-100 text-emerald-800')}>
          Submitted
        </span>
      ) : null}

      {transferModeBadge ? (
        <span className={transferModeBadge.className}>
          {transferModeBadge.label}
        </span>
      ) : null}

      {team.hasPendingApproval ? (
        <span className={badgeBase('bg-amber-100 text-amber-800')}>
          Pending Approval
        </span>
      ) : null}

      {team.hasDispute ? (
        <span className={badgeBase('bg-rose-100 text-rose-800')}>
          Dispute
        </span>
      ) : null}
    </div>
  );
}