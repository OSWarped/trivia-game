"use client";

import { ChevronLeft, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
}

type ModalMode = "add" | "edit" | null;

export default function ManageUsers() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editUserModal, setEditUserModal] = useState<User | null>(null);

  const [editedName, setEditedName] = useState("");
  const [editedEmail, setEditedEmail] = useState("");
  const [editedRole, setEditedRole] = useState<string>("HOST");
  const [saving, setSaving] = useState(false);
  const [editedPassword, setEditedPassword] = useState('');

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("/api/admin/users");
        if (!res.ok) throw new Error("Failed to fetch users");
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load users.");
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  function resetForm() {
    setEditedName('');
    setEditedEmail('');
    setEditedRole('HOST');
    setEditedPassword('');
    setEditUserModal(null);
  }

  function closeModal() {
    setModalMode(null);
    setEditUserModal(null);
    resetForm();
  }

  function openAddModal() {
    resetForm();
    setModalMode("add");
  }

  function openEditModal(user: User) {
    setEditUserModal(user);
    setEditedName(user.name || "");
    setEditedEmail(user.email);
    setEditedRole(user.role || "HOST");
    setModalMode("edit");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const payload =
        modalMode === 'add'
          ? {
            name: editedName.trim(),
            email: editedEmail.trim(),
            role: editedRole,
            password: editedPassword,
          }
          : {
            name: editedName.trim(),
            email: editedEmail.trim(),
            role: editedRole,
          };

      if (modalMode === "add") {
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          throw new Error(errorData?.error || "Failed to create user");
        }

        const newUser = await res.json();
        setUsers((prev) => [...prev, newUser]);
        closeModal();
        return;
      }

      if (modalMode === "edit" && editUserModal) {
        const res = await fetch(`/api/admin/users/${editUserModal.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          throw new Error(errorData?.error || "Failed to update user");
        }

        const updatedUser = await res.json();

        setUsers((prev) =>
          prev.map((user) => (user.id === updatedUser.id ? updatedUser : user))
        );

        closeModal();
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to save user.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteUser(user: User) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${user.name || user.email}? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setError("");

      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to delete user");
      }

      setUsers((prev) => prev.filter((u) => u.id !== user.id));

      if (editUserModal?.id === user.id) {
        closeModal();
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to delete user.");
    }
  }

  if (loading) return <div>Loading users...</div>;

  return (
    <div>
      <button
        onClick={() => router.push("/admin/workspace")}
        className="mb-4 flex items-center text-blue-600 hover:underline"
      >
        <ChevronLeft className="mr-1" size={18} />
        Back to Admin Panel
      </button>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage Users</h1>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
        >
          <Plus size={18} />
          Add User
        </button>
      </div>

      {error && <div className="mb-4 text-red-500">{error}</div>}

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
              <td className="border border-gray-300 px-4 py-2">{user.name || "N/A"}</td>
              <td className="border border-gray-300 px-4 py-2">{user.email}</td>
              <td className="border border-gray-300 px-4 py-2">
                {user.role ?? "No role"}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(user)}
                    className="rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user)}
                    className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modalMode && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-bold">
              {modalMode === "add" ? "Add User" : "Edit User"}
            </h2>

            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Name"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="mb-4 w-full border p-2"
                required
              />

              <input
                type="email"
                placeholder="Email"
                value={editedEmail}
                onChange={(e) => setEditedEmail(e.target.value)}
                className="mb-4 w-full border p-2"
                required
              />

              {modalMode === "add" && (
                <input
                  type="password"
                  placeholder="Temporary Password"
                  value={editedPassword}
                  onChange={(e) => setEditedPassword(e.target.value)}
                  className="mb-4 w-full border p-2"
                  required
                  minLength={8}
                />
              )}

              <div className="mb-4">
                <label className="mb-2 block font-medium">Role</label>
                <select
                  value={editedRole}
                  onChange={(e) => setEditedRole(e.target.value)}
                  className="w-full border p-2"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="HOST">Host</option>
                  <option value="PLAYER">Player</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded bg-gray-500 px-4 py-2 text-white"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
                  disabled={saving}
                >
                  {saving
                    ? modalMode === "add"
                      ? "Creating..."
                      : "Saving..."
                    : modalMode === "add"
                      ? "Create User"
                      : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}