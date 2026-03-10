'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { CalendarDays, ChevronLeft, Layers3, PlayCircle } from 'lucide-react';
import ScheduleWizard from '@/components/ScheduleWizard';

/* ——— Types coming from API ——— */
interface EventSchedule {
  id: string;
  freq: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  dow?: number;
  nthDow?: number;
  dayOfMonth?: number;
  timeUTC: string;
}

interface ActiveSeasonSummary {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string | null;
  active: boolean;
  gameCount: number;
}

interface EventSummary {
  id: string;
  name: string;
  createdAt: string;
  schedules: EventSchedule[];
  seasonCount: number;
  activeSeason: ActiveSeasonSummary | null;
}

/* ——— Utils ——— */
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatSchedule(s: EventSchedule): string {
  if (s.freq === 'WEEKLY') return `${weekdays[s.dow ?? 0]} ${s.timeUTC}`;
  if (s.freq === 'BIWEEKLY') return `Every other ${weekdays[s.dow ?? 0]} ${s.timeUTC}`;
  if (s.dayOfMonth) return `Month-day ${s.dayOfMonth} ${s.timeUTC}`;
  return `${['1st', '2nd', '3rd', '4th', '5th'][(s.nthDow ?? 1) - 1]} ${weekdays[s.dow ?? 0]} ${s.timeUTC}`;
}

function formatDate(date: string | null): string {
  if (!date) return 'Ongoing';
  return new Date(date).toLocaleDateString();
}

/* ——— Component ——— */
export default function ManageEventsPage() {
  const router = useRouter();
  const { siteId } = useParams<{ siteId: string }>();
  const { isAdmin, loading: authLoading } = useAuth();

  const [authChecked, setAuthChecked] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  const [events, setEvents] = useState<EventSummary[]>([]);
  const [edit, setEdit] = useState<EventSummary | null>(null);
  const [nameIn, setNameIn] = useState('');
  const [dowIn, setDowIn] = useState(4);
  const [timeIn, setTimeIn] = useState('19:00');
  const [uiLoading, setUiLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!isAdmin) {
      router.push('/login');
      return;
    }

    setAuthChecked(true);
  }, [authLoading, isAdmin, router]);

  const loadEvents = useCallback(async () => {
    try {
      setPageLoading(true);
      const res = await fetch(`/api/admin/sites/${siteId}/events`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error('Failed to load events');
      }

      const data = (await res.json()) as EventSummary[];
      setEvents(data);
    } catch (err) {
      console.error(err);
      window.alert('Failed to load events.');
    } finally {
      setPageLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    if (!authChecked) return;
    void loadEvents();
  }, [authChecked, loadEvents]);

  const startEdit = (eventItem: EventSummary) => {
    setEdit(eventItem);
    setNameIn(eventItem.name);
  };

  const cancel = () => {
    setEdit(null);
    setNameIn('');
  };

  const saveEdit = async () => {
    if (!edit) return;
    if (!nameIn.trim()) {
      window.alert('Event name is required.');
      return;
    }

    setUiLoading(true);

    const res = await fetch(`/api/admin/events/${edit.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameIn.trim() }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      window.alert(data.error ?? 'Failed to update event.');
      setUiLoading(false);
      return;
    }

    cancel();
    setUiLoading(false);
    await loadEvents();
  };

  const deleteEvent = async (id: string) => {
    if (!window.confirm('Delete this event and its schedules?')) return;

    const res = await fetch(`/api/admin/events/${id}`, { method: 'DELETE' });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      window.alert(data.error ?? 'Failed to delete event.');
      return;
    }

    setEvents((arr) => arr.filter((ev) => ev.id !== id));
  };

  const addEvent = async () => {
    if (!nameIn.trim()) {
      window.alert('Event name is required.');
      return;
    }

    setUiLoading(true);

    const res = await fetch('/api/admin/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteId,
        name: nameIn.trim(),
        schedules: [{ freq: 'WEEKLY', dow: dowIn, timeUTC: timeIn }],
      }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      window.alert(data.error ?? 'Failed to create event.');
      setUiLoading(false);
      return;
    }

    setNameIn('');
    setUiLoading(false);
    await loadEvents();
  };

  if (!authChecked || pageLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="rounded-xl bg-white p-6 shadow">Loading events...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <Link href="/admin/workspace" className="mb-4 inline-flex items-center text-blue-600 hover:underline">
        <ChevronLeft className="mr-1" size={18} /> Back to Sites
      </Link>

      <div className="mb-6 rounded-xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-gray-900">Events for Site</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage recurring event series, their schedules, and jump into seasons.
        </p>
      </div>

      <section className="mb-6">
        <div className="mb-4 flex items-center gap-2">
          <Layers3 size={20} className="text-gray-600" />
          <h2 className="text-xl font-semibold">Events</h2>
        </div>

        {events.length === 0 ? (
          <div className="rounded-xl bg-white p-6 shadow">
            <p className="text-gray-600">No events have been created for this site yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((ev) => (
              <div key={ev.id} className="rounded-xl bg-white p-5 shadow">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-xl font-semibold text-gray-900">{ev.name}</h3>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays size={16} />
                        {ev.schedules.length > 0
                          ? ev.schedules.map(formatSchedule).join(' • ')
                          : 'No schedules yet'}
                      </span>

                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                        {ev.seasonCount} season{ev.seasonCount === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                      {ev.activeSeason ? (
                        <>
                          <p className="text-sm font-semibold text-gray-800">Active Season</p>
                          <p className="mt-1 text-sm text-gray-700">{ev.activeSeason.name}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {formatDate(ev.activeSeason.startsAt)} - {formatDate(ev.activeSeason.endsAt)}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {ev.activeSeason.gameCount} game{ev.activeSeason.gameCount === 1 ? '' : 's'}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-gray-800">No Active Season</p>
                          <p className="mt-1 text-xs text-gray-500">
                            Open this event to create or activate a season.
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/admin/events/${ev.id}`}
                      className="inline-flex items-center gap-2 rounded bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
                    >
                      <PlayCircle size={16} />
                      Open Event
                    </Link>

                    {ev.activeSeason && (
                      <Link
                        href={`/admin/seasons/${ev.activeSeason.id}`}
                        className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        View Active Season
                      </Link>
                    )}

                    <button
                      className="rounded bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                      onClick={() => {
                        setActiveEventId(ev.id);
                        setShowWizard(true);
                      }}
                    >
                      + Schedule
                    </button>

                    <button
                      className="rounded bg-yellow-500 px-3 py-2 text-sm font-medium text-white hover:bg-yellow-600"
                      onClick={() => startEdit(ev)}
                    >
                      Edit
                    </button>

                    <button
                      className="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                      onClick={() => deleteEvent(ev.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {edit ? (
        <FormCard
          title="Edit Event"
          name={nameIn}
          setName={setNameIn}
          onPrimary={saveEdit}
          primaryLabel="Save"
          loading={uiLoading}
          onCancel={cancel}
          scheduleFields={false}
        />
      ) : (
        <FormCard
          title="Add Weekly Event"
          name={nameIn}
          setName={setNameIn}
          onPrimary={addEvent}
          primaryLabel="Add Event"
          loading={uiLoading}
          onCancel={() => setNameIn('')}
          scheduleFields={true}
          dowIn={dowIn}
          setDowIn={setDowIn}
          timeIn={timeIn}
          setTimeIn={setTimeIn}
        />
      )}

      {showWizard && activeEventId && (
        <ScheduleWizard
          onSave={async (payload) => {
            const res = await fetch(`/api/admin/events/${activeEventId}/schedules`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            if (!res.ok) {
              const data = (await res.json()) as { error?: string };
              window.alert(data.error ?? 'Failed to add schedule.');
              return;
            }

            setShowWizard(false);
            setActiveEventId(null);
            await loadEvents();
          }}
          onClose={() => {
            setShowWizard(false);
            setActiveEventId(null);
          }}
        />
      )}
    </div>
  );
}

/* ——— Re-usable Card ——— */
function FormCard(props: {
  title: string;
  name: string;
  setName: (v: string) => void;
  onPrimary: () => void;
  primaryLabel: string;
  loading: boolean;
  onCancel: () => void;
  scheduleFields: boolean;
  dowIn?: number;
  setDowIn?: (n: number) => void;
  timeIn?: string;
  setTimeIn?: (t: string) => void;
}) {
  return (
    <section className="mb-6 rounded-xl bg-white p-6 shadow">
      <h2 className="mb-4 text-xl font-semibold">{props.title}</h2>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block font-medium">Name</label>
          <input
            className="w-full rounded border border-gray-300 p-2"
            value={props.name}
            onChange={(e) => props.setName(e.target.value)}
          />
        </div>

        {props.scheduleFields && (
          <>
            <div>
              <label className="mb-1 block font-medium">Weekday</label>
              <select
                className="w-full rounded border p-2"
                value={props.dowIn}
                onChange={(e) => props.setDowIn?.(parseInt(e.target.value, 10))}
              >
                {weekdays.map((day, i) => (
                  <option key={day} value={i}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block font-medium">Start Time (UTC)</label>
              <input
                type="time"
                className="w-full rounded border p-2"
                value={props.timeIn}
                onChange={(e) => props.setTimeIn?.(e.target.value)}
              />
            </div>
          </>
        )}
      </div>

      <div className="mt-4 flex space-x-4">
        <button
          type="button"
          onClick={props.onPrimary}
          disabled={props.loading}
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {props.primaryLabel}
        </button>

        <button
          type="button"
          onClick={props.onCancel}
          disabled={props.loading}
          className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}