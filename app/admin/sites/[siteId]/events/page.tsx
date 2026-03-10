'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { CalendarDays, ChevronLeft, Layers3, PlayCircle } from 'lucide-react';
import ScheduleWizard from '@/components/ScheduleWizard';
import AppBackground from '@/components/AppBackground';

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
      <AppBackground variant="dashboard">
        <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
            Loading events...
          </div>
        </div>
      </AppBackground>
    );
  }

  return (
    <AppBackground variant="dashboard">
      <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <Link
              href="/admin/workspace"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition hover:bg-white"
            >
              <ChevronLeft size={18} />
              Back to Sites
            </Link>
          </div>

          <header className="rounded-3xl border border-white/10 bg-white/80 px-6 py-6 shadow-xl backdrop-blur-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Venue Operations
                </div>

                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                  Site Events
                </h1>

                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Manage recurring event series, schedules, and active seasons
                  for this venue.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{events.length}</span>{' '}
                event{events.length === 1 ? '' : 's'}
              </div>
            </div>
          </header>

          <section className="rounded-3xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                <Layers3 size={18} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Events</h2>
                <p className="text-sm text-slate-600">
                  Open event detail, manage schedules, and jump into active seasons.
                </p>
              </div>
            </div>

            {events.length === 0 ? (
              <EmptyState
                title="No events yet"
                description="No events have been created for this site yet."
              />
            ) : (
              <div className="space-y-4">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-xl font-semibold text-slate-900">
                          {ev.name}
                        </h3>

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays size={16} />
                            {ev.schedules.length > 0
                              ? ev.schedules.map(formatSchedule).join(' • ')
                              : 'No schedules yet'}
                          </span>

                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                            {ev.seasonCount} season{ev.seasonCount === 1 ? '' : 's'}
                          </span>
                        </div>

                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                          {ev.activeSeason ? (
                            <>
                              <p className="text-sm font-semibold text-slate-900">
                                Active Season
                              </p>
                              <p className="mt-1 text-sm text-slate-700">
                                {ev.activeSeason.name}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatDate(ev.activeSeason.startsAt)} -{' '}
                                {formatDate(ev.activeSeason.endsAt)}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {ev.activeSeason.gameCount} game
                                {ev.activeSeason.gameCount === 1 ? '' : 's'}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-semibold text-slate-900">
                                No Active Season
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Open this event to create or activate a season.
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={`/admin/events/${ev.id}`}
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                        >
                          <PlayCircle size={16} />
                          Open Event
                        </Link>

                        {ev.activeSeason ? (
                          <Link
                            href={`/admin/seasons/${ev.activeSeason.id}`}
                            className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            View Active Season
                          </Link>
                        ) : null}

                        <button
                          className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          onClick={() => {
                            setActiveEventId(ev.id);
                            setShowWizard(true);
                          }}
                        >
                          Add Schedule
                        </button>

                        <button
                          className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          onClick={() => startEdit(ev)}
                        >
                          Edit
                        </button>

                        <button
                          className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
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
              description="Update the event name for this recurring series."
              name={nameIn}
              setName={setNameIn}
              onPrimary={saveEdit}
              primaryLabel="Save Changes"
              loading={uiLoading}
              onCancel={cancel}
              scheduleFields={false}
            />
          ) : (
            <FormCard
              title="Add Weekly Event"
              description="Create a new recurring event series for this site."
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
      </div>
    </AppBackground>
  );
}

/* ——— Re-usable Card ——— */
function FormCard(props: {
  title: string;
  description?: string;
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
    <section className="rounded-3xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900">{props.title}</h2>
        {props.description ? (
          <p className="mt-1 text-sm text-slate-600">{props.description}</p>
        ) : null}
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={props.name}
            onChange={(e) => props.setName(e.target.value)}
          />
        </div>

        {props.scheduleFields ? (
          <>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Weekday
              </label>
              <select
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Start Time (UTC)
              </label>
              <input
                type="time"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={props.timeIn}
                onChange={(e) => props.setTimeIn?.(e.target.value)}
              />
            </div>
          </>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={props.onPrimary}
          disabled={props.loading}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {props.primaryLabel}
        </button>

        <button
          type="button"
          onClick={props.onCancel}
          disabled={props.loading}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-10 text-center">
      <div className="text-lg font-semibold text-slate-900">{title}</div>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
        {description}
      </p>
    </div>
  );
}