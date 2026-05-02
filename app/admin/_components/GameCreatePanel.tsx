'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SeasonSummary, UserRow } from '../_lib/types';

interface GameCreatePanelProps {
  seasons: SeasonSummary[];
  users: UserRow[];
  presetSeasonId?: string;
  title?: string;
  description?: string;
  submitLabel?: string;
  onCreated?: () => Promise<void> | void;
}

export default function GameCreatePanel({
  seasons,
  users,
  presetSeasonId,
  title = 'New Trivia Game',
  description = 'Choose where this game belongs, then schedule it and assign a host.',
  submitLabel = 'Create Game',
  onCreated,
}: GameCreatePanelProps) {
  const hostOptions = useMemo(
    () => users.filter((user) => ['ADMIN', 'HOST'].includes(user.role?.toUpperCase() ?? '')),
    [users]
  );

  const [seasonId, setSeasonId] = useState(presetSeasonId ?? '');
  const [gameTitle, setGameTitle] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [hostId, setHostId] = useState('');
  const [special, setSpecial] = useState(false);
  const [tag, setTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (presetSeasonId) {
      setSeasonId(presetSeasonId);
      return;
    }

    if (!seasonId && seasons.length === 1) {
      setSeasonId(seasons[0].id);
    }
  }, [presetSeasonId, seasonId, seasons]);

  const selectedSeason = useMemo(
    () => seasons.find((season) => season.id === seasonId) ?? null,
    [seasonId, seasons]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!seasonId) {
      setError('Please choose where this game belongs.');
      setSuccess(null);
      return;
    }

    if (!gameTitle.trim()) {
      setError('Game title is required.');
      setSuccess(null);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/admin/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seasonId,
          title: gameTitle.trim(),
          scheduledFor: scheduledFor || null,
          hostId: hostId || null,
          special,
          tag: special ? tag.trim() || null : null,
        }),
      });

      const payload = (await response.json()) as { error?: string; title?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to create game.');
      }

      setGameTitle('');
      setScheduledFor('');
      setHostId('');
      setSpecial(false);
      setTag('');
      setSuccess(payload.title ? `Created ${payload.title}.` : 'Game created successfully.');

      if (onCreated) {
        await onCreated();
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Failed to create game.'
      );
      setSuccess(null);
    } finally {
      setSaving(false);
    }
  }

  if (seasons.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
        No trivia schedules are available here yet. Add a location, trivia night, and season before scheduling games.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {!presetSeasonId ? (
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">
              Location / Trivia Night / Season
            </span>
            <select
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            >
              <option value="">Select where this game belongs</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.siteName} • {season.eventName} • {season.name}
                </option>
              ))}
            </select>
          </label>
        ) : selectedSeason ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            Creating inside <span className="font-semibold text-slate-900">{selectedSeason.name}</span>
            {' '}for {selectedSeason.siteName} • {selectedSeason.eventName}
          </div>
        ) : null}

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Game title</span>
          <input
            type="text"
            value={gameTitle}
            onChange={(e) => setGameTitle(e.target.value)}
            placeholder="Thursday Trivia - Week 3"
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Scheduled for</span>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Host</span>
            <select
              value={hostId}
              onChange={(e) => setHostId(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            >
              <option value="">Unassigned</option>
              {hostOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email} ({user.role})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={special}
              onChange={(e) => setSpecial(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
            />
            Mark this as a special game
          </label>

          {special ? (
            <label className="mt-4 block space-y-2">
              <span className="text-sm font-medium text-slate-700">Tag</span>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Holiday, Finals, Bonus Night"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
              />
            </label>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Creating...' : submitLabel}
          </button>
          <span className="text-xs text-slate-500">
            A join code is generated automatically. Games with a date start as scheduled; games without one stay as drafts.
          </span>
        </div>
      </form>
    </div>
  );
}
