'use client';

import React from 'react';
import type { UserRow } from '../types/workspace.types';
import SectionCard from './ui/SectionCard';
import ToolbarButton from './ui/ToolbarButton';

interface UsersPanelProps {
  users: UserRow[];
  onOpenDetails: (user: UserRow) => void;
  onEdit: (user: UserRow) => void;
  onDelete: (user: UserRow) => void | Promise<void>;
}

export default function UsersPanel({
  users,
  onOpenDetails,
  onEdit,
  onDelete,
}: UsersPanelProps) {
  return (
    <SectionCard
      title="Users"
      subtitle="Manage admins, hosts, and application users."
    >
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
            {users.map((user) => (
              <tr key={user.id} className="bg-slate-50 text-sm text-slate-800">
                <td className="rounded-l-xl px-3 py-3 font-medium">
                  {user.name || 'N/A'}
                </td>
                <td className="px-3 py-3">{user.email}</td>
                <td className="px-3 py-3">{user.role}</td>
                <td className="rounded-r-xl px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    <ToolbarButton
                      label="Details"
                      onClick={() => onOpenDetails(user)}
                    />
                    <ToolbarButton label="Edit" onClick={() => onEdit(user)} />
                    <ToolbarButton
                      label="Delete"
                      onClick={() => void onDelete(user)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
            No users matched your filters.
          </div>
        )}
      </div>
    </SectionCard>
  );
}