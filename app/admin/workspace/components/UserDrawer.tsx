'use client';

import React from 'react';
import type { UserRow } from '../types/workspace.types';
import DrawerShell from './ui/DrawerShell';
import ToolbarButton from './ui/ToolbarButton';

interface UserDrawerProps {
  user: UserRow | null;
  open: boolean;
  onClose: () => void;
  onEdit: (user: UserRow) => void;
}

export default function UserDrawer({
  user,
  open,
  onClose,
  onEdit,
}: UserDrawerProps) {
  return (
    <DrawerShell
      open={open}
      title={user?.name ?? 'User Details'}
      subtitle="Manage user identity and access."
      onClose={onClose}
    >
      {user ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-600">Email</div>
            <div className="mt-1 font-medium text-slate-900">
              {user.email}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-600">Role</div>
            <div className="mt-1 font-medium text-slate-900">
              {user.role}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <ToolbarButton
              label="Edit User"
              onClick={() => onEdit(user)}
              primary
            />
          </div>
        </div>
      ) : null}
    </DrawerShell>
  );
}