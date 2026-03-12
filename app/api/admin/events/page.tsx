'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '../_components/AdminPageHeader';
import AdminSectionCard from '../_components/AdminSectionCard';
import LoadingCard from '../_components/LoadingCard';
import type { EventSummary, SiteGroup } from '../_lib/types';
import { buildEventSummaries, flattenGames, includesText } from '../_lib/utils';

export default function AdminEventsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadData(): Promise<void> {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/admin/games', { cache: 'no-store' });

        if (!response.ok) {
          throw new Error('Failed to load events.');
        }

        const siteGroups = (await response.json()) as SiteGroup[];
        const gameRows = flattenGames(siteGroups);
        setEvents(buildEventSummaries(gameRows));
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : 'Failed to load events.'
        );
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  const filteredEvents = useMemo(() => {
    if (!search.trim()) {
      return events;
    }

    return events.filter((event) =>
      includesText(`${event.name} ${event.siteName}`, search)
    );
  }, [events, search]);

  if (loading) {
    return <LoadingCard label="Loading events..." />;
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
        title="Events"
        description="Events are organizational containers. They stay visible, but games remain the fastest path into work."
      />

      <AdminSectionCard
        title="Browse Events"
        description="Search by event or site, then jump into seasons or directly into a game from the event page."
      >
        <div className="space-y-4">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search events..."
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredEvents.map((event) => (
              <Link
                key={event.id}
                href={`/admin/events/${event.id}`}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {event.siteName}
                </div>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">
                  {event.name}
                </h2>
                <div className="mt-4 grid gap-2 text-sm text-slate-600">
                  <div>Seasons: {event.seasonCount}</div>
                  <div>Games: {event.gameCount}</div>
                  <div>Upcoming: {event.upcomingCount}</div>
                </div>
              </Link>
            ))}
          </div>

          {filteredEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
              No events matched that search.
            </div>
          ) : null}
        </div>
      </AdminSectionCard>
    </div>
  );
}
