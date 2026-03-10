'use client';

import React from 'react';
import type { AdminTab } from '../types/workspace.types';
import ToolbarButton from './ui/ToolbarButton';

interface AdminWorkspaceHeaderProps {
  activeTab: AdminTab;
  onAddSite: () => void;
  onRefresh: () => void;
  onAddUser: () => void;
  refreshing?: boolean;
}

const TAB_COPY: Record<
  AdminTab,
  { eyebrow: string; subtitle: string }
> = {
  sites: {
    eyebrow: 'Venue Operations',
    subtitle: 'Manage sites, events, seasons, and venue structure.',
  },
  games: {
    eyebrow: 'Game Operations',
    subtitle: 'Review game configuration, schedules, and runtime readiness.',
  },
  users: {
    eyebrow: 'Access Management',
    subtitle: 'Manage hosts, admins, and user access for the platform.',
  },
};

export default function AdminWorkspaceHeader({
  activeTab,
  onAddSite,
  onRefresh,
  onAddUser,
  refreshing = false,
}: AdminWorkspaceHeaderProps) {
  const copy = TAB_COPY[activeTab];

  return (
    <header className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {copy.eyebrow}
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Quizzam Admin
          </h1>

          <p className="mt-1 text-sm text-slate-600">{copy.subtitle}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <ToolbarButton
            label="Refresh"
            onClick={onRefresh}
            disabled={refreshing}
          />

          {activeTab === 'sites' ? (
            <ToolbarButton label="Add Site" onClick={onAddSite} primary />
          ) : null}

          {activeTab === 'users' ? (
            <ToolbarButton label="Add User" onClick={onAddUser} primary />
          ) : null}
        </div>
      </div>
    </header>
  );
}