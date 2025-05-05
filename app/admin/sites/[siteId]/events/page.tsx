'use client';

import { useEffect, useState } from 'react';
import Link                     from 'next/link';
import { useRouter }            from 'next/navigation';
import { useParams }            from 'next/navigation';
import { useAuth }              from '@/context/AuthContext';
import { ChevronLeft }          from 'lucide-react';

import ScheduleWizard from '@/components/ScheduleWizard';


/* ——— Types coming from API ——— */
interface EventSchedule {
  id:         string;
  freq:       'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  dow?:       number;   // 0‑6
  nthDow?:    number;   // 1‑5
  dayOfMonth?:number;   // 1‑31
  timeUTC:    string;   // "19:00"
}

interface Event {
  id:        string;
  name:      string;
  schedules: EventSchedule[];
}

/* ——— Utils ——— */
const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function formatSchedule(s: EventSchedule) {
  if (s.freq === 'WEEKLY')   return `${weekdays[s.dow!]} ${s.timeUTC}`;
  if (s.freq === 'BIWEEKLY') return `Every other ${weekdays[s.dow!]} ${s.timeUTC}`;
  if (s.dayOfMonth)          return `Month‑day ${s.dayOfMonth} ${s.timeUTC}`;
  return `${['1st','2nd','3rd','4th','5th'][s.nthDow!-1]} ${weekdays[s.dow!]} ${s.timeUTC}`;
}

/* ——— Component ——— */
export default function ManageEvents() {
  const router       = useRouter();
  const { siteId }   = useParams<{ siteId: string }>();
  const { isAdmin }  = useAuth();

  const [showWizard, setShowWizard] = useState(false);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);


  if (!isAdmin) {
    router.push('/login');
    return null;
  }

  const [events, setEvents]   = useState<Event[]>([]);
  const [edit,   setEdit]     = useState<Event | null>(null);
  const [nameIn, setNameIn]   = useState('');
  const [dowIn,  setDowIn]    = useState(4);        // Thu default
  const [timeIn, setTimeIn]   = useState('19:00');
  const [loading,setLoading]  = useState(false);

  /* fetch */
  useEffect(() => {
    (async () => {
      const res  = await fetch(`/api/admin/sites/${siteId}/events`);
      const data = await res.json();
      setEvents(data as Event[]);
    })();
  }, [siteId]);

  /* helpers */
  const startEdit = (e: Event) => {
    setEdit(e);
    setNameIn(e.name);
  };

  const saveEdit = async () => {
    if (!edit) return;
    setLoading(true);
    const res = await fetch(`/api/admin/events/${edit.id}`, {
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name: nameIn }),
    });
    if (res.ok) {
      const upd: Event = await res.json();
      setEvents(arr => arr.map(ev => ev.id === upd.id ? upd : ev));
      cancel();
    }
    setLoading(false);
  };

  const cancel = () => { setEdit(null); setNameIn(''); };

  const deleteEvent = async (id: string) => {
    if (!confirm('Delete this event (and schedules)?')) return;
    const res = await fetch(`/api/admin/events/${id}`, { method:'DELETE' });
    if (res.ok) setEvents(arr => arr.filter(ev => ev.id !== id));
  };

  const addEvent = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/events', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        siteId,
        name: nameIn,
        schedules:[{ freq:'WEEKLY', dow:dowIn, timeUTC:timeIn }],
      }),
    });
    if (res.ok) {
      const created: Event = await res.json();
      setEvents(arr => [...arr, created]);
      setNameIn('');
    }
    setLoading(false);
  };

  /* ——— UI ——— */
  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <Link
        href="/admin/sites"
        className="mb-4 flex items-center text-blue-600 hover:underline"
      >
        <ChevronLeft className="mr-1" size={18}/> Back to Sites
      </Link>

      <h1 className="text-2xl font-bold mb-6">Events for Site</h1>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Events</h2>
        <ul className="space-y-2">
          {events.map(ev => (
            <li key={ev.id}
                className="flex justify-between items-center bg-white p-3 rounded shadow">
              <span className="text-gray-700">
                {ev.name} — {ev.schedules.map(formatSchedule).join(' • ')}
              </span>

              <div className="flex space-x-3">
                <Link
                  href={`/admin/events/${ev.id}`}
                  className="bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-600"
                >
                  Manage Seasons
                </Link>

                <button
  className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
  onClick={() => { setActiveEventId(ev.id); setShowWizard(true); }}
>
  + Schedule
</button>


                <button
                  className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                  onClick={() => startEdit(ev)}
                >
                  Edit
                </button>
                <button
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  onClick={() => deleteEvent(ev.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Edit */}
      {edit && (
        <FormCard
          title="Edit Event"
          name={nameIn}
          setName={setNameIn}
          onPrimary={saveEdit}
          primaryLabel="Save"
          loading={loading}
          onCancel={cancel}
          scheduleFields={false}
        />
      )}

      {/* Add */}
      {!edit && (
        <FormCard
          title="Add Weekly Event"
          name={nameIn}
          setName={setNameIn}
          onPrimary={addEvent}
          primaryLabel="Add Event"
          loading={loading}
          onCancel={() => setNameIn('')}
          scheduleFields={true}
          dowIn={dowIn}
          setDowIn={setDowIn}
          timeIn={timeIn}
          setTimeIn={setTimeIn}
        />
      )}

       {/* Schedule Wizard Modal */}
       {showWizard && activeEventId && (
        <ScheduleWizard
          onSave={async payload => {
            const res = await fetch(
              `/api/admin/events/${activeEventId}/schedules`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              }
            );
            if (res.ok) {
              const newRow = await res.json();
              setEvents(arr => arr.map(ev =>
                ev.id === activeEventId
                  ? { ...ev, schedules: [...ev.schedules, newRow] }
                  : ev
              ));
            }
          }}
          onClose={() => setShowWizard(false)}
        />
      )}

      
    </div>
  );
}


/* ——— Re‑usable Card ——— */
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
  const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return (
    <section className="bg-white p-6 rounded shadow mb-6">
      <h2 className="text-xl font-semibold mb-4">{props.title}</h2>
      <div className="space-y-4">
        <div>
          <label className="block font-medium mb-1">Name</label>
          <input
            className="border border-gray-300 p-2 rounded w-full"
            value={props.name}
            onChange={e => props.setName(e.target.value)}
          />
        </div>

        {props.scheduleFields && (
          <>
            <div>
              <label className="block font-medium mb-1">Weekday</label>
              <select
                className="border p-2 rounded w-full"
                value={props.dowIn}
                onChange={e => props.setDowIn!(parseInt(e.target.value))}
              >
                {weekdays.map((d,i)=>
                  <option key={i} value={i}>{d}</option>
                )}
              </select>
            </div>
            <div>
              <label className="block font-medium mb-1">Start Time (UTC)</label>
              <input
                type="time"
                className="border p-2 rounded w-full"
                value={props.timeIn}
                onChange={e => props.setTimeIn!(e.target.value)}
              />
            </div>
          </>
        )}
      </div>

      <div className="flex space-x-4 mt-4">
        <button
          onClick={props.onPrimary}
          disabled={props.loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {props.primaryLabel}
        </button>
        <button
          onClick={props.onCancel}
          disabled={props.loading}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Cancel
        </button>
      </div>
    </section>

    
  );


  
}
