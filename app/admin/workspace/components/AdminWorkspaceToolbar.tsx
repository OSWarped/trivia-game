'use client';

import React from 'react';
import type { AdminTab } from '../types/workspace.types';
interface AdminWorkspaceToolbarProps {
  activeTab: AdminTab;
  searchTerm: string;
  onChangeSearchTerm: (value: string) => void;
  statusFilter: string;
  onChangeStatusFilter: (value: string) => void;
  searchPlaceholder: string;
  primaryLabel?: string;
  onPrimaryAction?: () => void;
}

const STATUS_OPTIONS: Record<
  Exclude<AdminTab, 'users'>,
  Array<{ value: string; label: string }>
> = {
  sites: [
    { value: 'ALL', label: 'All Sites' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
  ],
  games: [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'LIVE', label: 'Live' },
    { value: 'CLOSED', label: 'Closed' },
    { value: 'CANCELED', label: 'Canceled' },
  ],
};

export default function AdminWorkspaceToolbar({
  activeTab,
  searchTerm,
  onChangeSearchTerm,
  statusFilter,
  onChangeStatusFilter,
  searchPlaceholder, 
}: AdminWorkspaceToolbarProps) {
  const showStatusFilter = activeTab !== 'users';
  const options =
    activeTab === 'users' ? [] : STATUS_OPTIONS[activeTab];

 

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => onChangeSearchTerm(e.target.value)}
        placeholder={searchPlaceholder}
        className="w-full min-w-[240px] rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
      />

      {showStatusFilter ? (
        <select
          value={statusFilter}
          onChange={(e) => onChangeStatusFilter(e.target.value)}
          className="min-w-[170px] rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}

     
    </div>
  );
}