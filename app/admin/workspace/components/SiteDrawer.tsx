'use client';

import React from 'react';
import Link from 'next/link';
import type { SiteRow } from '../types/workspace.types';
import DrawerShell from './ui/DrawerShell';
import ToolbarButton from './ui/ToolbarButton';

interface SiteDrawerEvent {
    id: string;
    name: string;
    upcomingGames: number;
}

interface SiteDrawerProps {
    site: SiteRow | null;
    open: boolean;
    onClose: () => void;
    onEdit: (site: SiteRow) => void;
    events?: SiteDrawerEvent[];
    onOpenEvent?: (eventId: string) => void;
}

export default function SiteDrawer({
    site,
    open,
    onClose,
    onEdit,
    events = [],
    onOpenEvent,
}: SiteDrawerProps) {
    return (
        <DrawerShell
            open={open}
            title={site?.name ?? 'Site Details'}
            subtitle="Operational summary for this site."
            meta="Site"
            widthClassName="max-w-2xl"
            zIndexClassName="z-40"
            onClose={onClose}
        >
            {site ? (
                <div className="space-y-6">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-sm text-slate-600">Address</div>
                        <div className="mt-1 font-medium text-slate-900">
                            {site.address ?? 'N/A'}
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="text-sm text-slate-600">Status</div>
                            <div className="mt-1 font-medium text-slate-900">
                                {site.status ?? 'ACTIVE'}
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="text-sm text-slate-600">Upcoming Games</div>
                            <div className="mt-1 font-medium text-slate-900">
                                {site.upcomingGames ?? 0}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="text-sm text-slate-600">Active Event</div>
                        <div className="mt-1 font-medium text-slate-900">
                            {site.activeEvent ?? 'No active event'}
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                            Events
                        </div>

                        {events.length === 0 ? (
                            <div className="text-sm text-slate-500">
                                No events found for this site.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {events.map((event) => (
                                    <div
                                        key={event.id}
                                        className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                                    >
                                        <div>
                                            <div className="font-medium text-slate-900">
                                                {event.name}
                                            </div>
                                            <div className="mt-1 text-sm text-slate-500">
                                                {event.upcomingGames} upcoming game
                                                {event.upcomingGames === 1 ? '' : 's'}
                                            </div>
                                        </div>

                                        {onOpenEvent ? (
                                            <ToolbarButton
                                                label="Open"
                                                onClick={() => onOpenEvent(event.id)}
                                            />
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <ToolbarButton
                            label="Edit Site"
                            onClick={() => onEdit(site)}
                            primary
                        />
                        <Link
                            href={`/admin/sites/${site.id}/events`}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                            Manage Events
                        </Link>
                    </div>
                </div>
            ) : null}
        </DrawerShell>
    );
}