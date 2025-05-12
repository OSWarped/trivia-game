'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ChevronLeft } from 'lucide-react';

/* ───────────────────────────── Types ──────────────────────────── */
interface Site {
  id: string;
  name: string;
  address: string | null;
}

/* ─────────────────────────── Component ────────────────────────── */
export default function ManageSites() {
  const router = useRouter();
  const { isAdmin, loading } = useAuth();

  const [authChecked, setAuthChecked] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [editSite, setEdit] = useState<Site | null>(null);
  const [nameInput, setName] = useState('');
  const [addressInput, setAddress] = useState('');
  const [uiLoading, setUiLoading] = useState(false);

  // 🔐 Auth gate: redirect if not admin
  useEffect(() => {
    if (loading) return;
  
    if (!isAdmin) {
      router.push('/login');
    } else {
      setAuthChecked(true);
    }
  }, [isAdmin, loading, router]);

  // ✅ Fetch data only after auth check
  useEffect(() => {
    if (!authChecked) return;

    (async () => {
      const res = await fetch('/api/admin/sites');
      const data = await res.json();
      setSites(data as Site[]);
    })();
  }, [authChecked]);

  const startEdit = (s: Site) => {
    setEdit(s);
    setName(s.name);
    setAddress(s.address ?? '');
  };

  const saveEdit = async () => {
    if (!editSite) return;
    setUiLoading(true);
    const res = await fetch(`/api/admin/sites/${editSite.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameInput, address: addressInput }),
    });
    if (res.ok) {
      const updated: Site = await res.json();
      setSites(arr => arr.map(s => (s.id === updated.id ? updated : s)));
      cancelEdit();
    } else alert('Failed to update site');
    setUiLoading(false);
  };

  const cancelEdit = () => {
    setEdit(null);
    setName('');
    setAddress('');
  };

  const deleteSite = async (id: string) => {
    if (!confirm('Delete this site?')) return;
    const res = await fetch(`/api/admin/sites/${id}`, { method: 'DELETE' });
    if (res.ok) setSites(arr => arr.filter(s => s.id !== id));
  };

  const addSite = async () => {
    setUiLoading(true);
    const res = await fetch('/api/admin/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameInput, address: addressInput }),
    });
    if (res.ok) {
      const created: Site = await res.json();
      setSites(arr => [...arr, created]);
      setName('');
      setAddress('');
    } else alert('Failed to create site');
    setUiLoading(false);
  };

  if (!authChecked) return null;

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <Link
        href="/admin/dashboard"
        className="mb-4 flex items-center text-blue-600 hover:underline"
      >
        <ChevronLeft className="mr-1" size={18} />
        Back to Admin Panel
      </Link>

      <h1 className="text-2xl font-bold mb-6">Manage Sites</h1>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Sites</h2>
        <ul className="space-y-2">
          {sites.map(site => (
            <li
              key={site.id}
              className="flex justify-between items-center bg-white p-3 rounded shadow"
            >
              <span className="text-gray-700">
                {site.name} — {site.address ?? 'N/A'}
              </span>

              <div className="flex space-x-3">
                <Link
                  href={`/admin/sites/${site.id}/events`}
                  className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                >
                  Manage&nbsp;Events
                </Link>
                <button
                  className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                  onClick={() => startEdit(site)}
                >
                  Edit
                </button>
                <button
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  onClick={() => deleteSite(site.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {editSite && (
        <EditOrAddForm
          title="Edit Site"
          name={nameInput}
          address={addressInput}
          setName={setName}
          setAddress={setAddress}
          primaryLabel="Save"
          onPrimary={saveEdit}
          onCancel={cancelEdit}
          loading={uiLoading}
        />
      )}

      {!editSite && (
        <EditOrAddForm
          title="Add New Site"
          name={nameInput}
          address={addressInput}
          setName={setName}
          setAddress={setAddress}
          primaryLabel="Add Site"
          onPrimary={addSite}
          onCancel={() => {
            setName('');
            setAddress('');
          }}
          loading={uiLoading}
        />
      )}
    </div>
  );
}

/* ───────────── Re‑usable Form component ───────────── */
function EditOrAddForm({
  title,
  name,
  address,
  setName,
  setAddress,
  primaryLabel,
  onPrimary,
  onCancel,
  loading,
}: {
  title: string;
  name: string;
  address: string;
  setName: (v: string) => void;
  setAddress: (v: string) => void;
  primaryLabel: string;
  onPrimary: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <section className="bg-white p-6 rounded shadow mb-6">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <div className="space-y-4">
        <div>
          <label className="block font-medium mb-1">Name</label>
          <input
            className="border border-gray-300 p-2 rounded w-full"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Address</label>
          <input
            className="border border-gray-300 p-2 rounded w-full"
            value={address}
            onChange={e => setAddress(e.target.value)}
          />
        </div>
      </div>
      <div className="flex space-x-4 mt-4">
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          onClick={onPrimary}
          disabled={loading}
        >
          {primaryLabel}
        </button>
        <button
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    </section>
  );
}
