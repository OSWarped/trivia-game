'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '../_components/AdminPageHeader';
import AdminSectionCard from '../_components/AdminSectionCard';
import LoadingCard from '../_components/LoadingCard';
import type { SeasonSummary, SiteGroup } from '../_lib/types';
import { buildSeasonSummaries, flattenGames, formatDate, includesText } from '../_lib/utils';

export default function AdminSeasonsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<SeasonSummary[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadData(): Promise<void> {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/admin/games', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Failed to load seasons.');
        }

        const siteGroups = (await response.json()) as SiteGroup[];
        setSeasons(buildSeasonSummaries(flattenGames(siteGroups)));
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : 'Failed to load seasons.'
        );
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  const filteredSeasons = useMemo(() => {
    if (!search.trim()) {
      return seasons;
    }

    return seasons.filter((season) =>
      includesText(
        `${season.name} ${season.eventName} ${season.siteName}`,
        search
      )
    );
  }, [search, seasons]);

  if (loading) {
    return <LoadingCard label="Loading seasons..." />;
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Structure"
        title="Seasons"
        description="Season pages are useful for schedule organization, standings, and jumping into all games in one run."
      />

      <AdminSectionCard
        title="Browse Seasons"
        description="Use this when you want a higher-level schedule view without losing direct access to game editing."
      >
        <div className="space-y-4">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search seasons..."
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredSeasons.map((season) => (
              <Link
                key={season.id}
                href={`/admin/seasons/${season.id}`}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {season.siteName} • {season.eventName}
                </div>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">
                  {season.name}
                </h2>
                <div className="mt-4 grid gap-2 text-sm text-slate-600">
                  <div>Games: {season.gameCount}</div>
                  <div>Upcoming: {season.upcomingCount}</div>
                  <div>Live: {season.liveCount}</div>
                  <div>
                    Window: {formatDate(season.firstScheduledFor)} - {formatDate(season.lastScheduledFor)}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {filteredSeasons.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
              No seasons matched that search.
            </div>
          ) : null}
        </div>
      </AdminSectionCard>
    </div>
  );
}
