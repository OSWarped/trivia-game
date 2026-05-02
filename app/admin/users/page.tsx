'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminPageHeader from '../_components/AdminPageHeader';
import AdminSectionCard from '../_components/AdminSectionCard';
import LoadingCard from '../_components/LoadingCard';
import type { UserRow } from '../_lib/types';
import { includesText } from '../_lib/utils';

type ModalMode = 'add' | 'edit' | null;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('HOST');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadUsers(): Promise<void> {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/users', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to fetch users.');
      }

      const rows = (await response.json()) as UserRow[];
      setUsers(rows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) {
      return users;
    }

    return users.filter((user) =>
      includesText(`${user.name ?? ''} ${user.email} ${user.role}`, search)
    );
  }, [search, users]);

  function openAdd(): void {
    setModalMode('add');
    setSelectedUser(null);
    setName('');
    setEmail('');
    setRole('HOST');
    setPassword('');
  }

  function openEdit(user: UserRow): void {
    setModalMode('edit');
    setSelectedUser(user);
    setName(user.name ?? '');
    setEmail(user.email);
    setRole(user.role || 'HOST');
    setPassword('');
  }

  function closeModal(): void {
    setModalMode(null);
    setSelectedUser(null);
    setName('');
    setEmail('');
    setRole('HOST');
    setPassword('');
  }

  async function saveUser(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    try {
      setSaving(true);
      setError(null);

      const payload =
        modalMode === 'add'
          ? {
              name: name.trim(),
              email: email.trim(),
              role,
              password,
            }
          : {
              name: name.trim(),
              email: email.trim(),
              role,
            };

      const endpoint =
        modalMode === 'edit' && selectedUser
          ? `/api/admin/users/${selectedUser.id}`
          : '/api/admin/users';
      const method = modalMode === 'edit' ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'Failed to save user.');
      }

      closeModal();
      await loadUsers();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(user: UserRow): Promise<void> {
    if (!window.confirm(`Delete ${user.name ?? user.email}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete user.');
      }

      if (selectedUser?.id === user.id) {
        closeModal();
      }

      await loadUsers();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete user.');
    }
  }

  if (loading) {
    return <LoadingCard label="Loading users..." />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Access"
        title="People"
        description="Manage admins and hosts. Players do not need accounts to join games."
      />

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <AdminSectionCard
          title="People Directory"
          description="Search by name, email, or role."
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search users..."
                className="min-w-[260px] flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={openAdd}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Add User
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="bg-slate-50 text-sm text-slate-800">
                      <td className="rounded-l-2xl px-3 py-3 font-medium">
                        {user.name || 'Unnamed user'}
                      </td>
                      <td className="px-3 py-3">{user.email}</td>
                      <td className="px-3 py-3">{user.role}</td>
                      <td className="rounded-r-2xl px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(user)}
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteUser(user)}
                            className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title={modalMode === 'edit' ? 'Edit User' : 'Add User'}
          description="Keep the form close by so user administration does not feel like a separate application."
        >
          <form className="space-y-4" onSubmit={(event) => void saveUser(event)}>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                required
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Role
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              >
                <option value="HOST">HOST</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </label>

            {modalMode === 'add' ? (
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  required
                />
              </label>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {saving ? 'Saving...' : modalMode === 'edit' ? 'Save User' : 'Create User'}
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Clear
              </button>
            </div>
          </form>
        </AdminSectionCard>
      </div>
    </div>
  );
}
