"use client"

import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
}

export default function ManageUsers() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editUserModal, setEditUserModal] = useState<User | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [editedRole, setEditedRole] = useState<string>('HOST'); // or default ''

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch('/api/admin/users');
        if (!res.ok) throw new Error('Failed to fetch users');
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        console.error(err);
        setError('Failed to load users.');
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  function openEditModal(user: User) {
    setEditUserModal(user);
    setEditedName(user.name || '');
    setEditedEmail(user.email);
    setEditedRole(user.role);
  }

  async function handleSaveChanges(e: React.FormEvent) {
    e.preventDefault();
    if (!editUserModal) return;

    try {
      const res = await fetch(`/api/admin/users/${editUserModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editedName,
          email: editedEmail,
          roles: editedRole,
        }),
      });

      if (!res.ok) throw new Error('Failed to update user');
      const updatedUser = await res.json();

      // Update the users state with the updated user
      setUsers((prev) =>
        prev.map((user) => (user.id === updatedUser.id ? updatedUser : user))
      );

      setEditUserModal(null);
    } catch (err) {
      console.error(err);
      setError('Failed to save changes.');
    }
  }

  if (loading) return <div>Loading users...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div>
      <button
        onClick={() => router.push('/admin/dashboard')}
        className="mb-4 flex items-center text-blue-600 hover:underline"
      >
        <ChevronLeft className="mr-1" size={18} />
        Back to Admin Panel
      </button>
      <h1 className="text-2xl font-bold mb-4">Manage Users</h1>
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
            <th className="border border-gray-300 px-4 py-2 text-left">Email</th>
            <th className="border border-gray-300 px-4 py-2 text-left">Role</th>
            <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="border border-gray-300 px-4 py-2">{user.name || 'N/A'}</td>
              <td className="border border-gray-300 px-4 py-2">{user.email}</td>
              <td className="border border-gray-300 px-4 py-2">
  {user.role ?? 'No role'}
</td>


              <td className="border border-gray-300 px-4 py-2">
                <button
                  onClick={() => openEditModal(user)}
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Edit User Modal */}
      {editUserModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-lg">
            <h2 className="text-xl font-bold mb-4">Edit User</h2>
            <form onSubmit={handleSaveChanges}>
              <input
                type="text"
                placeholder="Name"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="border p-2 w-full mb-4"
              />
              <input
                type="email"
                placeholder="Email"
                value={editedEmail}
                onChange={(e) => setEditedEmail(e.target.value)}
                className="border p-2 w-full mb-4"
              />
              <div className="mb-4">
                <label className="block font-medium mb-2">Roles</label>
                {/* Role (single‑select) */}
<select
  value={editedRole}                    // ← string, not array
  onChange={(e) => setEditedRole(e.target.value)}
  className="border p-2 w-full"
>
  <option value="ADMIN">Admin</option>
  <option value="HOST">Host</option>
  <option value="PLAYER">Player</option>
</select>

              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditUserModal(null)}
                  className="bg-gray-500 text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
