'use client';

import React from 'react';
import ModalShell from './ui/ModalShell';
import ToolbarButton from './ui/ToolbarButton';
import type { UserRow } from '../types/workspace.types';

interface GameModalProps {
  open: boolean;
  gameTitle: string;
  gameScheduledFor: string;
  gameHostId: string;
  gameStatus: string;
  gameSpecial: boolean;
  gameTag: string;
  users: UserRow[];
  saving: boolean;
  onClose: () => void;
  onChangeTitle: (value: string) => void;
  onChangeScheduledFor: (value: string) => void;
  onChangeHostId: (value: string) => void;
  onChangeStatus: (value: string) => void;
  onChangeSpecial: (value: boolean) => void;
  onChangeTag: (value: string) => void;
  onSave: () => void | Promise<void>;
}

export default function GameModal({
  open,
  gameTitle,
  gameScheduledFor,
  gameHostId,
  gameStatus,
  gameSpecial,
  gameTag,
  users,
  saving,
  onClose,
  onChangeTitle,
  onChangeScheduledFor,
  onChangeHostId,
  onChangeStatus,
  onChangeSpecial,
  onChangeTag,
  onSave,
}: GameModalProps) {
  return (
    <ModalShell
      open={open}
      title="Edit Game"
      subtitle="Update scheduling, host assignment, and game flags."
      onClose={onClose}
    >
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Game title"
          value={gameTitle}
          onChange={(e) => onChangeTitle(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
        />

        <input
          type="datetime-local"
          value={gameScheduledFor}
          onChange={(e) => onChangeScheduledFor(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
        />

        <select
          value={gameHostId}
          onChange={(e) => onChangeHostId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
        >
          <option value="">No host assigned</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name || user.email}
            </option>
          ))}
        </select>

        <select
          value={gameStatus}
          onChange={(e) => onChangeStatus(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
        >
          <option value="DRAFT">DRAFT</option>
          <option value="SCHEDULED">SCHEDULED</option>
          <option value="LIVE">LIVE</option>
          <option value="CLOSED">CLOSED</option>
        </select>

        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={gameSpecial}
            onChange={(e) => onChangeSpecial(e.target.checked)}
            className="h-4 w-4"
          />
          Special game
        </label>

        <input
          type="text"
          placeholder="Special tag"
          value={gameTag}
          onChange={(e) => onChangeTag(e.target.value)}
          disabled={!gameSpecial}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-100"
        />

        <div className="flex justify-end gap-3">
          <ToolbarButton label="Cancel" onClick={onClose} />
          <ToolbarButton
            label="Save Changes"
            onClick={() => void onSave()}
            primary
            disabled={saving}
          />
        </div>
      </div>
    </ModalShell>
  );
}