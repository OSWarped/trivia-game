'use client';

import React from 'react';
import ModalShell from './ui/ModalShell';
import ToolbarButton from './ui/ToolbarButton';
import type { SiteRow } from '../types/workspace.types';

interface EventModalProps {
  open: boolean;
  eventName: string;
  eventSiteId: string;
  eventSiteName?: string;
  sites: SiteRow[];
  saving: boolean;
  onClose: () => void;
  onChangeName: (value: string) => void;
  onChangeSiteId: (value: string) => void;
  onSave: () => void | Promise<void>;
}

export default function EventModal({
  open,
  eventName,
  eventSiteId,
  eventSiteName,
  sites,
  saving,
  onClose,
  onChangeName,
  onChangeSiteId,
  onSave,
}: EventModalProps) {
  return (
    <ModalShell
      open={open}
      title="Edit Event"
      subtitle="Update the event name and site assignment."
      onClose={onClose}
    >
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Event name"
          value={eventName}
          onChange={(e) => onChangeName(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none text-slate-900 placeholder:text-slate-400"
        />

        <select
          value={eventSiteId}
          onChange={(e) => onChangeSiteId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none text-slate-900 placeholder:text-slate-400"
        >
          <option value="">Select site</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </select>

        {eventSiteName ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Current site:{' '}
            <span className="font-medium text-slate-900">{eventSiteName}</span>
          </div>
        ) : null}

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