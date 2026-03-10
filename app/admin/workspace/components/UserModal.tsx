'use client';

import React from 'react';
import ModalShell from './ui/ModalShell';
import ToolbarButton from './ui/ToolbarButton';

interface UserModalProps {
  open: boolean;
  mode: 'add' | 'edit';
  userName: string;
  userEmail: string;
  userRole: string;
  userPassword: string;
  saving: boolean;
  onClose: () => void;
  onChangeName: (value: string) => void;
  onChangeEmail: (value: string) => void;
  onChangeRole: (value: string) => void;
  onChangePassword: (value: string) => void;
  onSave: () => void | Promise<void>;
}

export default function UserModal({
  open,
  mode,
  userName,
  userEmail,
  userRole,
  userPassword,
  saving,
  onClose,
  onChangeName,
  onChangeEmail,
  onChangeRole,
  onChangePassword,
  onSave,
}: UserModalProps) {
  const isEdit = mode === 'edit';

  return (
    <ModalShell
      open={open}
      title={isEdit ? 'Edit User' : 'Add User'}
      subtitle={
        isEdit
          ? 'Update user identity and role.'
          : 'Create a new admin or host.'
      }
      onClose={onClose}
    >
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Name"
          value={userName}
          onChange={(e) => onChangeName(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none text-slate-900 placeholder:text-slate-400"
        />
        <input
          type="email"
          placeholder="Email"
          value={userEmail}
          onChange={(e) => onChangeEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none text-slate-900 placeholder:text-slate-400"
        />
        <select
          value={userRole}
          onChange={(e) => onChangeRole(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none text-slate-900 placeholder:text-slate-400"
        >
          <option value="HOST">HOST</option>
          <option value="ADMIN">ADMIN</option>
          <option value="USER">USER</option>
        </select>

        {!isEdit ? (
          <input
            type="password"
            placeholder="Password"
            value={userPassword}
            onChange={(e) => onChangePassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none text-slate-900 placeholder:text-slate-400"
          />
        ) : null}

        <div className="flex justify-end gap-3">
          <ToolbarButton label="Cancel" onClick={onClose} />
          <ToolbarButton
            label={isEdit ? 'Save Changes' : 'Create User'}
            onClick={() => void onSave()}
            primary
            disabled={saving}
          />
        </div>
      </div>
    </ModalShell>
  );
}