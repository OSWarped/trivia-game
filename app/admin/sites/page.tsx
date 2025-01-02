'use client';

import { useState, useEffect } from 'react';

interface Site {
  id: string;
  name: string;
  location: string;
}

export default function ManageSites() {
  const [sites, setSites] = useState<Site[]>([]);
  const [editSite, setEditSite] = useState<Site | null>(null); // For editing a site
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');

  // Fetch the sites from the API
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

    fetchSites();
  }, []);

  // Start editing a site
  function startEditSite(site: Site) {
    setEditSite(site);
    setEditName(site.name);
    setEditLocation(site.location);
  }

  // Save the edited site
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
        setEditSite(null); // Clear edit mode
        setEditName('');
        setEditLocation('');
      } else {
        alert('Failed to update site');
      }
    } catch (err) {
      console.error('Error updating site:', err);
    }
  }

  // Delete a site
  async function deleteSite(siteId: string) {
    if (!confirm('Are you sure you want to delete this site?')) return;

    try {
      const res = await fetch(`/api/admin/sites/${siteId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSites((prevSites) => prevSites.filter((site) => site.id !== siteId));
      } else {
        alert('Failed to delete site');
      }
    } catch (err) {
      console.error('Error deleting site:', err);
    }
  }

  // Create a new site
  async function addNewSite() {
    const newSite = { name: editName, location: editLocation };

    try {
      const res = await fetch('/api/admin/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSite),
      });

      if (res.ok) {
        const createdSite = await res.json();
        setSites((prevSites) => [...prevSites, createdSite]);
        setEditName('');
        setEditLocation('');
      } else {
        alert('Failed to create site');
      }
    } catch (err) {
      console.error('Error adding site:', err);
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
              <span className="text-gray-700">{site.name} - {site.location}</span>
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

      {/* Editing a site */}
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

      {/* Adding a new site */}
      {!editSite && (
        <div className="bg-white p-6 rounded shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Add New Site</h2>
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
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              onClick={addNewSite}
            >
              Add Site
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
