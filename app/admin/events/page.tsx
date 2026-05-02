'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '../_components/AdminPageHeader';
import AdminSectionCard from '../_components/AdminSectionCard';
import LoadingCard from '../_components/LoadingCard';
import type { EventSummary, SiteRow } from '../_lib/types';
import { includesText } from '../_lib/utils';

export default function AdminEventsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [search, setSearch] = useState('');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [siteIdInput, setSiteIdInput] = useState('');
  const [nameInput, setNameInput] = useState('');

  async function loadData(): Promise<void> {
    try {
      setLoading(true);
      setError(null);

      const [eventsRes, sitesRes] = await Promise.all([
        fetch('/api/admin/events', { cache: 'no-store' }),
        fetch('/api/admin/sites', { cache: 'no-store' }),
      ]);

      if (!eventsRes.ok || !sitesRes.ok) {
        throw new Error('Failed to load events.');
      }

      const eventRows = (await eventsRes.json()) as EventSummary[];
      const siteRows = (await sitesRes.json()) as SiteRow[];

      setEvents(eventRows);
      setSites(siteRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
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

  function startEdit(event: EventSummary): void {
    setEditingEventId(event.id);
    setSiteIdInput(event.siteId);
    setNameInput(event.name);
  }

  function resetForm(): void {
    setEditingEventId(null);
    setSiteIdInput('');
    setNameInput('');
  }

  async function saveEvent(): Promise<void> {
    if (!siteIdInput.trim()) {
      setError('Location is required.');
      return;
    }

    if (!nameInput.trim()) {
      setError('Trivia night name is required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const endpoint = editingEventId
        ? `/api/admin/events/${editingEventId}`
        : '/api/admin/events';
      const method = editingEventId ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: siteIdInput,
          name: nameInput.trim(),
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'Failed to save event.');
      }

      resetForm();
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save event.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent(eventId: string): Promise<void> {
    if (!window.confirm('Delete this trivia night?')) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'Failed to delete event.');
      }

      if (editingEventId === eventId) {
        resetForm();
      }

      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete event.');
    }
  }

  if (loading) {
    return <LoadingCard label="Loading trivia nights..." />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Locations"
        title="Trivia Nights"
        description="Use this setup area for recurring nights or series at each location. Most admins can start from Games instead."
      />

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <AdminSectionCard
          title="Browse Trivia Nights"
          description="Search by trivia night or location, open the workspace, or manage the core record."
        >
          <div className="space-y-4">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search trivia nights..."
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
            />

            <div className="space-y-3">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {event.siteName}
                    </div>
                    <div className="mt-2 text-lg font-semibold text-slate-900">{event.name}</div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                      <span>{event.seasonCount} seasons</span>
                      <span>{event.gameCount} games</span>
                      <span>{event.upcomingCount} upcoming</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/events/${event.id}`}
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Open Trivia Night
                    </Link>
                    <button
                      type="button"
                      onClick={() => startEdit(event)}
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteEvent(event.id)}
                      className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {filteredEvents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
                  No trivia nights matched that search.
                </div>
              ) : null}
            </div>
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title={editingEventId ? 'Edit Trivia Night' : 'Add Trivia Night'}
          description="Create a recurring night first when a location has more than one trivia series."
        >
          <div className="space-y-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Location
              <select
                value={siteIdInput}
                onChange={(event) => setSiteIdInput(event.target.value)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              >
                <option value="">Select a location...</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Trivia Night Name
              <input
                type="text"
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void saveEvent()}
                disabled={saving}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {saving ? 'Saving...' : editingEventId ? 'Save Trivia Night' : 'Create Trivia Night'}
              </button>

              {(editingEventId || siteIdInput || nameInput) ? (
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
