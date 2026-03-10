'use client';

import React from 'react';
import ModalShell from './ui/ModalShell';
import ToolbarButton from './ui/ToolbarButton';

interface SeasonModalProps {
  open: boolean;
  seasonName: string;
  seasonStartsAt: string;
  seasonEndsAt: string;
  seasonActive: boolean;
  seasonEventName?: string;
  saving: boolean;
  onClose: () => void;
  onChangeName: (value: string) => void;
  onChangeStartsAt: (value: string) => void;
  onChangeEndsAt: (value: string) => void;
  onChangeActive: (value: boolean) => void;
  onSave: () => void | Promise<void>;
}

export default function SeasonModal({
  open,
  seasonName,
  seasonStartsAt,
  seasonEndsAt,
  seasonActive,
  seasonEventName,
  saving,
  onClose,
  onChangeName,
  onChangeStartsAt,
  onChangeEndsAt,
  onChangeActive,
  onSave,
}: SeasonModalProps) {
  return (
    <ModalShell
      open={open}
      title="Edit Season"
      subtitle="Update season timing and status."
      onClose={onClose}
    >
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Season name"
          value={seasonName}
          onChange={(e) => onChangeName(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none text-slate-900 placeholder:text-slate-400"
        />

        {seasonEventName ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Event:{' '}
            <span className="font-medium text-slate-900">{seasonEventName}</span>
          </div>
        ) : null}

        <input
          type="datetime-local"
          value={seasonStartsAt}
          onChange={(e) => onChangeStartsAt(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none text-slate-900 placeholder:text-slate-400"
        />

        <input
          type="datetime-local"
          value={seasonEndsAt}
          onChange={(e) => onChangeEndsAt(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none text-slate-900 placeholder:text-slate-400"
        />

        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={seasonActive}
            onChange={(e) => onChangeActive(e.target.checked)}
            className="h-4 w-4"
          />
          Season is active
        </label>

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