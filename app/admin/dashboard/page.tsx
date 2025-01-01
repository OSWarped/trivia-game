'use client';

import Link from 'next/link';

export default function AdminDashboard() {
  return (
    <div className="min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/admin/sites">
          <div className="p-6 bg-blue-500 text-white rounded-lg shadow cursor-pointer hover:bg-blue-600">
            <h2 className="text-xl font-bold">Manage Sites</h2>
            <p className="mt-2">Create, edit, and delete hosting sites.</p>
          </div>
        </Link>
        <Link href="/admin/users">
          <div className="p-6 bg-green-500 text-white rounded-lg shadow cursor-pointer hover:bg-green-600">
            <h2 className="text-xl font-bold">Manage Users</h2>
            <p className="mt-2">Edit roles and assign users to sites.</p>
          </div>
        </Link>
        <Link href="/admin/teams">
          <div className="p-6 bg-yellow-500 text-white rounded-lg shadow cursor-pointer hover:bg-yellow-600">
            <h2 className="text-xl font-bold">Manage Teams</h2>
            <p className="mt-2">Assign players and manage team details.</p>
          </div>
        </Link>
        <Link href="/admin/games">
          <div className="p-6 bg-red-500 text-white rounded-lg shadow cursor-pointer hover:bg-red-600">
            <h2 className="text-xl font-bold">Manage Games</h2>
            <p className="mt-2">View and edit game settings.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
