'use client';

import { useState, useEffect } from 'react';

interface Site {
  id: string;
  name: string;
  location: string;
}

interface User {
  id: string;
  email: string;
  role: string;
}

export default function ManageSites() {
  const [sites, setSites] = useState<Site[]>([]); // Define the type for sites
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]); // Define the type for users
  const [allUsers, setAllUsers] = useState<User[]>([]); // All users for dropdown
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newRole, setNewRole] = useState('');
  const [editSite, setEditSite] = useState<Site | null>(null); // Site being edited
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');

  useEffect(() => {
    async function fetchSites() {
      try {
        const res = await fetch('/api/admin/sites');
        const data = await res.json();
        setSites(data);
      } catch (err) {
        console.error('Error fetching sites:', err);
      }
    }

    async function fetchAllUsers() {
      try {
        const res = await fetch('/api/admin/users');
        const data = await res.json();
        setAllUsers(data);
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    }

    fetchSites();
    fetchAllUsers();
  }, []);

  async function fetchSiteUsers(siteId: string) {
    try {
      const res = await fetch(`/api/admin/sites/${siteId}/users`);
      const data = await res.json();
      setUsers(data);
      setSelectedSite(siteId);
    } catch (err) {
      console.error('Error fetching site users:', err);
    }
  }

  async function addUserToSite() {
    if (!selectedSite) return;

    try {
      const res = await fetch(`/api/admin/sites/${selectedSite}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, role: newRole }),
      });

      if (res.ok) {
        fetchSiteUsers(selectedSite); // Refresh the user list
        setSelectedUserId('');
        setNewRole('');
      } else {
        alert('Failed to add user to site');
      }
    } catch (err) {
      console.error('Error adding user to site:', err);
    }
  }

  function startEditSite(site: Site) {
    setEditSite(site);
    setEditName(site.name);
    setEditLocation(site.location);
  }

  async function saveEditSite() {
    if (!editSite) return;

    try {
      const res = await fetch(`/api/admin/sites/${editSite.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, location: editLocation }),
      });

      if (res.ok) {
        const updatedSite = await res.json();
        setSites((prevSites) =>
          prevSites.map((site) => (site.id === updatedSite.id ? updatedSite : site))
        );
        setEditSite(null);
        setEditName('');
        setEditLocation('');
      } else {
        alert('Failed to update site');
      }
    } catch (err) {
      console.error('Error updating site:', err);
    }
  }

  async function deleteSite(siteId: string) {
    if (!confirm('Are you sure you want to delete this site?')) return;

    try {
      const res = await fetch(`/api/admin/sites/${siteId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSites((prevSites) => prevSites.filter((site) => site.id !== siteId));
        if (selectedSite === siteId) {
          setSelectedSite(null);
          setUsers([]);
        }
      } else {
        alert('Failed to delete site');
      }
    } catch (err) {
      console.error('Error deleting site:', err);
    }
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Manage Sites</h1>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Sites</h2>
        <ul className="space-y-2">
          {sites.map((site) => (
            <li key={site.id} className="flex justify-between items-center">
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                onClick={() => fetchSiteUsers(site.id)}
              >
                {site.name}
              </button>
              <div className="flex space-x-4">
                <button
                  className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                  onClick={() => startEditSite(site)}
                >
                  Edit
                </button>
                <button
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  onClick={() => deleteSite(site.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {editSite && (
        <div className="bg-white p-6 rounded shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Edit Site</h2>
          <div className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Name</label>
              <input
                className="border border-gray-300 p-2 rounded w-full"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Location</label>
              <input
                className="border border-gray-300 p-2 rounded w-full"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
              />
            </div>
          </div>
          <div className="flex space-x-4 mt-4">
            <button
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              onClick={saveEditSite}
            >
              Save
            </button>
            <button
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              onClick={() => setEditSite(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {selectedSite && (
        <div className="bg-white p-6 rounded shadow-md">
          <h2 className="text-xl font-semibold mb-4">
            Users at {sites.find((s) => s.id === selectedSite)?.name}
          </h2>
          <ul className="space-y-2 mb-6">
            {users.map((user) => (
              <li key={user.id} className="flex justify-between items-center">
                <span className="text-gray-700">
                  {user.email} - <span className="text-blue-600 font-medium">{user.role}</span>
                </span>
              </li>
            ))}
          </ul>
          <div>
            <h3 className="text-lg font-semibold mb-2">Add User</h3>
            <div className="flex space-x-4 mb-4">
              <select
                className="border border-gray-300 p-2 rounded w-1/2"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">Select User</option>
                {allUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email}
                  </option>
                ))}
              </select>
              <select
                className="border border-gray-300 p-2 rounded w-1/2"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                <option value="">Select Role</option>
                <option value="ADMIN">Admin</option>
                <option value="HOST">Host</option>
                <option value="PLAYER">Player</option>
              </select>
            </div>
            <button
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              onClick={addUserToSite}
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
