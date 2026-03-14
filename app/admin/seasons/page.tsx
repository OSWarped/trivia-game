'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '../_components/AdminPageHeader';
import AdminSectionCard from '../_components/AdminSectionCard';
import LoadingCard from '../_components/LoadingCard';
import type { EventSummary, SeasonSummary } from '../_lib/types';
import { formatDate, includesText, toDateTimeLocal } from '../_lib/utils';

export default function AdminSeasonsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<SeasonSummary[]>([]);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [search, setSearch] = useState('');

  const [editingSeasonId, setEditingSeasonId] = useState<string | null>(null);
  const [eventIdInput, setEventIdInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [startsAtInput, setStartsAtInput] = useState('');
  const [endsAtInput, setEndsAtInput] = useState('');
  const [activeInput, setActiveInput] = useState(true);

  async function loadData(): Promise<void> {
    try {
      setLoading(true);
      setError(null);

      const [seasonsRes, eventsRes] = await Promise.all([
        fetch('/api/admin/seasons', { cache: 'no-store' }),
        fetch('/api/admin/events', { cache: 'no-store' }),
      ]);

      if (!seasonsRes.ok || !eventsRes.ok) {
        throw new Error('Failed to load seasons.');
      }

      const seasonRows = (await seasonsRes.json()) as SeasonSummary[];
      const eventRows = (await eventsRes.json()) as EventSummary[];

      setSeasons(seasonRows);
      setEvents(eventRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load seasons.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const filteredSeasons = useMemo(() => {
    if (!search.trim()) {
      return seasons;
    }

    return seasons.filter((season) =>
      includesText(`${season.name} ${season.eventName} ${season.siteName}`, search)
    );
  }, [search, seasons]);

  function startEdit(season: SeasonSummary): void {
    setEditingSeasonId(season.id);
    setEventIdInput(season.eventId);
    setNameInput(season.name);
    setStartsAtInput(toDateTimeLocal(season.firstScheduledFor));
    setEndsAtInput(toDateTimeLocal(season.lastScheduledFor));
    setActiveInput(true);
  }

  function resetForm(): void {
    setEditingSeasonId(null);
    setEventIdInput('');
    setNameInput('');
    setStartsAtInput('');
    setEndsAtInput('');
    setActiveInput(true);
  }

  async function saveSeason(): Promise<void> {
    if (!eventIdInput.trim()) {
      setError('Event is required.');
      return;
    }

    if (!nameInput.trim()) {
      setError('Season name is required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const endpoint = editingSeasonId
        ? `/api/admin/seasons/${editingSeasonId}`
        : '/api/admin/seasons';
      const method = editingSeasonId ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: eventIdInput,
          name: nameInput.trim(),
          startsAt: startsAtInput ? new Date(startsAtInput).toISOString() : null,
          endsAt: endsAtInput ? new Date(endsAtInput).toISOString() : null,
          active: activeInput,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'Failed to save season.');
      }

      resetForm();
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save season.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteSeason(seasonId: string): Promise<void> {
    if (!window.confirm('Delete this season?')) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/admin/seasons/${seasonId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'Failed to delete season.');
      }

      if (editingSeasonId === seasonId) {
        resetForm();
      }

      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete season.');
    }
  }

  if (loading) {
    return <LoadingCard label="Loading seasons..." />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Structure"
        title="Seasons"
        description="Season records now stay visible even before any games have been scheduled into them."
      />

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <AdminSectionCard
          title="Browse Seasons"
          description="Search by season, event, or site, then open the season workspace or manage the season record here."
        >
          <div className="space-y-4">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search seasons..."
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
            />

            <div className="space-y-3">
              {filteredSeasons.map((season) => (
                <div
                  key={season.id}
                  className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {season.siteName} • {season.eventName}
                    </div>
                    <div className="mt-2 text-lg font-semibold text-slate-900">{season.name}</div>
                    <div className="mt-3 grid gap-1 text-sm text-slate-600">
                      <div>Games: {season.gameCount}</div>
                      <div>Upcoming: {season.upcomingCount}</div>
                      <div>Live: {season.liveCount}</div>
                      <div>
                        Window: {formatDate(season.firstScheduledFor)} - {formatDate(season.lastScheduledFor)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/seasons/${season.id}`}
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Open Season
                    </Link>
                    <button
                      type="button"
                      onClick={() => startEdit(season)}
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteSeason(season.id)}
                      className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {filteredSeasons.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
                  No seasons matched that search.
                </div>
              ) : null}
            </div>
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title={editingSeasonId ? 'Edit Season' : 'Add Season'}
          description="You can build out season structure first, then attach games to it later."
        >
          <div className="space-y-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Event
              <select
                value={eventIdInput}
                onChange={(event) => setEventIdInput(event.target.value)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              >
                <option value="">Select an event...</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.siteName} • {event.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Season Name
              <input
                type="text"
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Start
              <input
                type="datetime-local"
                value={startsAtInput}
                onChange={(event) => setStartsAtInput(event.target.value)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              End
              <input
                type="datetime-local"
                value={endsAtInput}
                onChange={(event) => setEndsAtInput(event.target.value)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              />
            </label>

            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={activeInput}
                onChange={(event) => setActiveInput(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Active season
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void saveSeason()}
                disabled={saving}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {saving ? 'Saving...' : editingSeasonId ? 'Save Season' : 'Create Season'}
              </button>

              {(editingSeasonId || eventIdInput || nameInput || startsAtInput || endsAtInput || !activeInput) ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>
        </AdminSectionCard>
      </div>
    </div>
  );
}
