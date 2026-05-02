'use client';

import type { SiteRow } from '../_lib/types';

interface GamesFiltersBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  siteId: string;
  onSiteIdChange: (value: string) => void;
  datePreset: 'UPCOMING' | 'PAST' | 'ALL' | 'LIVE' | 'NEXT_30';
  onDatePresetChange: (value: 'UPCOMING' | 'PAST' | 'ALL' | 'LIVE' | 'NEXT_30') => void;
  sites: SiteRow[];
}

export default function GamesFiltersBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  siteId,
  onSiteIdChange,
  datePreset,
  onDatePresetChange,
  sites,
}: GamesFiltersBarProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(160px,1fr))]">
      <input
        type="text"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search by game, join code, location, trivia night, season, or host"
        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
      />

      <select
        value={status}
        onChange={(event) => onStatusChange(event.target.value)}
        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
      >
        <option value="ALL">All statuses</option>
        <option value="DRAFT">Draft</option>
        <option value="SCHEDULED">Scheduled</option>
        <option value="LIVE">Live</option>
        <option value="CLOSED">Closed</option>
        <option value="CANCELED">Canceled</option>
      </select>

      <select
        value={siteId}
        onChange={(event) => onSiteIdChange(event.target.value)}
        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
      >
        <option value="ALL">All locations</option>
        {sites.map((site) => (
          <option key={site.id} value={site.id}>
            {site.name}
          </option>
        ))}
      </select>

      <select
        value={datePreset}
        onChange={(event) =>
          onDatePresetChange(
            event.target.value as 'UPCOMING' | 'PAST' | 'ALL' | 'LIVE' | 'NEXT_30'
          )
        }
        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
      >
        <option value="NEXT_30">Next 30 days</option>
        <option value="UPCOMING">All upcoming</option>
        <option value="LIVE">Live only</option>
        <option value="PAST">Past only</option>
        <option value="ALL">All games</option>
      </select>
    </div>
  );
}
