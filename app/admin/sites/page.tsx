'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '../_components/AdminPageHeader';
import AdminSectionCard from '../_components/AdminSectionCard';
import LoadingCard from '../_components/LoadingCard';
import type { EventSummary, GameRow, SiteGroup, SiteRow } from '../_lib/types';
import { flattenGames, includesText } from '../_lib/utils';

export default function AdminSitesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [games, setGames] = useState<GameRow[]>([]);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [search, setSearch] = useState('');

  const [nameInput, setNameInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadData(): Promise<void> {
    try {
      setLoading(true);
      setError(null);

      const [sitesRes, gamesRes, eventsRes] = await Promise.all([
        fetch('/api/admin/sites', { cache: 'no-store' }),
        fetch('/api/admin/games', { cache: 'no-store' }),
        fetch('/api/admin/events', { cache: 'no-store' }),
      ]);

      if (!sitesRes.ok || !gamesRes.ok || !eventsRes.ok) {
        throw new Error('Failed to load sites.');
      }

      const siteRows = (await sitesRes.json()) as SiteRow[];
      const siteGroups = (await gamesRes.json()) as SiteGroup[];
      const eventRows = (await eventsRes.json()) as EventSummary[];

      setSites(siteRows);
      setGames(flattenGames(siteGroups));
      setEvents(eventRows);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Failed to load sites.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const summarizedSites = useMemo(() => {
    const records = sites
      .map((site) => {
        const siteGames = games.filter((game) => game.siteId === site.id);
        const siteEvents = events.filter((event) => event.siteId === site.id);

        return {
          ...site,
          eventCount: siteEvents.length,
          gameCount: siteGames.length,
          upcomingCount: siteGames.filter(
            (game) => !!game.scheduledFor && new Date(game.scheduledFor) >= new Date()
          ).length,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    if (!search.trim()) {
      return records;
    }

    return records.filter((site) =>
      includesText(`${site.name} ${site.address ?? ''}`, search)
    );
  }, [events, games, search, sites]);

  function startEdit(site: SiteRow): void {
    setEditingSiteId(site.id);
    setNameInput(site.name);
    setAddressInput(site.address ?? '');
  }

  function resetForm(): void {
    setEditingSiteId(null);
    setNameInput('');
    setAddressInput('');
  }

  async function saveSite(): Promise<void> {
    if (!nameInput.trim()) {
      setError('Site name is required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const endpoint = editingSiteId
        ? `/api/admin/sites/${editingSiteId}`
        : '/api/admin/sites';
      const method = editingSiteId ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameInput.trim(),
          address: addressInput.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'Failed to save site.');
      }

      resetForm();
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save site.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteSite(siteId: string): Promise<void> {
    if (!window.confirm('Delete this site?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/sites/${siteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete site.');
      }

      if (editingSiteId === siteId) {
        resetForm();
      }

      await loadData();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : 'Failed to delete site.'
      );
    }
  }

  if (loading) {
    return <LoadingCard label="Loading locations..." />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Setup"
        title="Locations"
        description="Locations are the places that host trivia. Open one to see its trivia nights, seasons, and games in context."
        actions={[
          { href: '/admin/events', label: 'Manage Trivia Nights' },
          { href: '/admin/seasons', label: 'Manage Seasons' },
        ]}
      />

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <AdminSectionCard
          title="Location List"
          description="Search locations, open a location workspace, or manage the basic venue record."
        >
          <div className="space-y-4">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search locations..."
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
            />

            <div className="space-y-3">
              {summarizedSites.map((site) => (
                <div
                  key={site.id}
                  className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="text-lg font-semibold text-slate-900">{site.name}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      {site.address ?? 'No address'}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                      <span>{site.eventCount} trivia nights</span>
                      <span>{site.gameCount} games</span>
                      <span>{site.upcomingCount} upcoming</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/sites/${site.id}`}
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Open Location
                    </Link>
                    <button
                      type="button"
                      onClick={() => startEdit(site)}
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteSite(site.id)}
                      className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {summarizedSites.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
                  No locations matched that search.
                </div>
              ) : null}
            </div>
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title={editingSiteId ? 'Edit Location' : 'Add Location'}
          description="Create the location once, then add trivia nights and seasons from its workspace."
        >
          <div className="space-y-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Location Name
              <input
                type="text"
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Address
              <textarea
                value={addressInput}
                onChange={(event) => setAddressInput(event.target.value)}
                rows={4}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void saveSite()}
                disabled={saving}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {saving ? 'Saving...' : editingSiteId ? 'Save Location' : 'Create Location'}
              </button>

              {(editingSiteId || nameInput || addressInput) ? (
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
