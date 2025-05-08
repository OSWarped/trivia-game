/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState } from 'react';
const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function ScheduleWizard({
  onSave,
  onClose,
}: {
  onSave: (payload: any) => Promise<void>;
  onClose: () => void;
}) {
  const [freq, setFreq]     = useState<'WEEKLY'|'BIWEEKLY'|'MONTHLY'>('WEEKLY');
  const [dow,  setDow]      = useState(4);
  const [nth,  setNth]      = useState(1);
  const [dom,  setDom]      = useState(1);
  const [time, setTime]     = useState('19:00');

  const save = async () => {
    const payload =
      freq === 'MONTHLY'
        ? dom
          ? { freq, dayOfMonth: dom, timeUTC: time }
          : { freq, nthDow: nth, dow, timeUTC: time }
        : { freq, dow, timeUTC: time };

    await onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-6 rounded w-96 space-y-4">
        <h3 className="text-lg font-semibold">Add Schedule</h3>

        <label className="block">
          Frequency
          <select value={freq} onChange={e=>setFreq(e.target.value as any)}
                  className="mt-1 border p-1 rounded w-full">
            <option value="WEEKLY">Weekly</option>
            <option value="BIWEEKLY">Bi‑Weekly</option>
            <option value="MONTHLY">Monthly</option>
          </select>
        </label>

        {(freq==='WEEKLY'||freq==='BIWEEKLY') && (
          <label className="block">
            Weekday
            <select value={dow} onChange={e=>setDow(+e.target.value)}
                    className="mt-1 border p-1 rounded w-full">
              {weekdays.map((d,i)=><option key={i} value={i}>{d}</option>)}
            </select>
          </label>
        )}

        {freq==='MONTHLY' && (
          <>
            <label className="block">
              Day‑of‑month (leave 0 to use nth weekday)
              <input type="number" min={0} max={31} value={dom}
                     onChange={e=>setDom(+e.target.value)}
                     className="mt-1 border p-1 rounded w-full" />
            </label>
            {dom===0 && (
              <>
                <label className="block">
                  Nth
                  <select value={nth} onChange={e=>setNth(+e.target.value)}
                          className="mt-1 border p-1 rounded w-full">
                    {[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <label className="block">
                  Weekday
                  <select value={dow} onChange={e=>setDow(+e.target.value)}
                          className="mt-1 border p-1 rounded w-full">
                    {weekdays.map((d,i)=><option key={i} value={i}>{d}</option>)}
                  </select>
                </label>
              </>
            )}
          </>
        )}

        <label className="block">
          Time (UTC)
          <input type="time" value={time}
                 onChange={e=>setTime(e.target.value)}
                 className="mt-1 border p-1 rounded w-full" />
        </label>

        <div className="flex space-x-3 justify-end pt-2">
          <button onClick={onClose} className="px-3 py-1 bg-gray-300 rounded">Cancel</button>
          <button onClick={save}    className="px-3 py-1 bg-blue-600 text-white rounded">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
