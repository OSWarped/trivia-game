'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface EventOverview {
  id: string;
  name: string;
  site: {
    id: string;
    name: string;
  };
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function NewSeasonPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuth();

  const [authChecked, setAuthChecked] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [eventData, setEventData] = useState<EventOverview | null>(null);

  const [name, setName] = useState('');
  const [startsAt, setStartsAt] = useState(toDateInputValue(new Date()));
  const [endsAt, setEndsAt] = useState('');
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!isAdmin) {
      router.push('/login');
      return;
    }

    setAuthChecked(true);
  }, [authLoading, isAdmin, router]);

  const loadEvent = useCallback(async () => {
    try {
      setPageLoading(true);
      setError(null);

      const res = await fetch(`/api/admin/events/${eventId}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Failed to load event.');
      }

      const data = (await res.json()) as EventOverview;
      setEventData({
        id: data.id,
        name: data.name,
        site: data.site,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setPageLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (!authChecked) return;
    void loadEvent();
  }, [authChecked, loadEvent]);

  async function createSeason(): Promise<void> {
    if (!name.trim()) {
      window.alert('Season name is required.');
      return;
    }

    if (!startsAt) {
      window.alert('Start date is required.');
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(`/api/admin/events/${eventId}/seasons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          startsAt,
          endsAt: endsAt || null,
          active,
        }),
      });

      const data = (await res.json()) as { id?: string; error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to create season.');
      }

      router.push(`/admin/seasons/${data.id}`);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to create season.');
    } finally {
      setSaving(false);
    }
  }

  if (!authChecked || pageLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="rounded-xl bg-white p-6 shadow">Loading...</div>
      </div>
    );
  }

  if (error || !eventData) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <Link
          href={`/admin/events/${eventId}`}
          className="mb-4 inline-flex items-center text-blue-600 hover:underline"
        >
          <ChevronLeft className="mr-1" size={18} />
          Back to Event
        </Link>

        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error ?? 'Unable to load event.'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <Link
        href={`/admin/events/${eventId}`}
        className="mb-4 inline-flex items-center text-blue-600 hover:underline"
      >
        <ChevronLeft className="mr-1" size={18} />
        Back to Event
      </Link>

      <div className="mb-6 rounded-xl bg-white p-6 shadow">
        <p className="text-sm text-gray-500">New Season</p>
        <h1 className="text-3xl font-bold text-gray-900">{eventData.name}</h1>
        <p className="mt-1 text-sm text-gray-600">
          Site: <span className="font-medium">{eventData.site.name}</span>
        </p>
      </div>

      <section className="rounded-xl bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Season Details</h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block font-medium text-gray-800">Season Name</label>
            <input
              className="w-full rounded border border-gray-300 p-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Spring 2026"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block font-medium text-gray-800">Start Date</label>
              <input
                type="date"
                className="w-full rounded border border-gray-300 p-2"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block font-medium text-gray-800">
                End Date <span className="text-gray-500">(optional)</span>
              </label>
              <input
                type="date"
                className="w-full rounded border border-gray-300 p-2"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Make this the active season
          </label>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            type="button"
            onClick={() => {
              void createSeason();
            }}
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Season'}
          </button>

          <Link
            href={`/admin/events/${eventId}`}
            className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
          >
            Cancel
          </Link>
        </div>
      </section>
    </div>
  );
}