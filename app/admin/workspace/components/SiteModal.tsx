'use client';

import React from 'react';
import ModalShell from './ui/ModalShell';
import ToolbarButton from './ui/ToolbarButton';

interface SiteModalProps {
  open: boolean;
  mode: 'add' | 'edit';
  siteName: string;
  siteAddress: string;
  saving: boolean;
  onClose: () => void;
  onChangeName: (value: string) => void;
  onChangeAddress: (value: string) => void;
  onSave: () => void | Promise<void>;
}

export default function SiteModal({
  open,
  mode,
  siteName,
  siteAddress,
  saving,
  onClose,
  onChangeName,
  onChangeAddress,
  onSave,
}: SiteModalProps) {
  const isEdit = mode === 'edit';

  return (
    <ModalShell
      open={open}
      title={isEdit ? 'Edit Site' : 'Add Site'}
      subtitle={
        isEdit ? 'Update site details.' : 'Create a new venue/site.'
      }
      onClose={onClose}
    >
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Site name"
          value={siteName}
          onChange={(e) => onChangeName(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
        />
        <input
          type="text"
          placeholder="Address"
          value={siteAddress}
          onChange={(e) => onChangeAddress(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
        />
        <div className="flex justify-end gap-3">
          <ToolbarButton label="Cancel" onClick={onClose} />
          <ToolbarButton
            label={isEdit ? 'Save Changes' : 'Save Site'}
            onClick={() => void onSave()}
            primary
            disabled={saving}
          />
        </div>
      </div>
    </ModalShell>
  );
}