'use client';

import React from 'react';
import type { SiteRow } from '../types/workspace.types';
import SectionCard from './ui/SectionCard';
import ToolbarButton from './ui/ToolbarButton';

interface SitesPanelProps {
  sites: SiteRow[];
  onOpenDetails: (site: SiteRow) => void;
  onEdit: (site: SiteRow) => void;
  onDelete: (site: SiteRow) => void | Promise<void>;
}

export default function SitesPanel({
  sites,
  onOpenDetails,
  onEdit,
  onDelete,
}: SitesPanelProps) {
  return (
    <SectionCard
      title="Sites"
      subtitle="Search, filter, and manage venue/site records."
    >
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              <th className="px-3 py-2">Site</th>
              <th className="px-3 py-2">Address</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Upcoming Games</th>
              <th className="px-3 py-2">Active Event</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((site) => (
              <tr key={site.id} className="bg-slate-50 text-sm text-slate-800">
                <td className="rounded-l-xl px-3 py-3 font-medium">
                  {site.name}
                </td>
                <td className="px-3 py-3">{site.address ?? 'N/A'}</td>
                <td className="px-3 py-3">
                  <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                    {site.status ?? 'ACTIVE'}
                  </span>
                </td>
                <td className="px-3 py-3">{site.upcomingGames ?? 0}</td>
                <td className="px-3 py-3">{site.activeEvent ?? '—'}</td>
                <td className="rounded-r-xl px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    <ToolbarButton
                      label="Details"
                      onClick={() => onOpenDetails(site)}
                    />
                    <ToolbarButton label="Edit" onClick={() => onEdit(site)} />
                    <ToolbarButton
                      label="Delete"
                      onClick={() => void onDelete(site)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sites.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
            No sites matched your filters.
          </div>
        )}
      </div>
    </SectionCard>
  );
}