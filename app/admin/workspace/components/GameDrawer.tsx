'use client';

import React from 'react';
import Link from 'next/link';
import type { GameRow } from '../types/workspace.types';
import { formatDateTime } from '../utils/workspace.helpers';
import DrawerShell from './ui/DrawerShell';
import ToolbarButton from './ui/ToolbarButton';

interface GameDrawerProps {
    game: GameRow | null;
    open: boolean;
    onClose: () => void;
    onEdit: (game: GameRow) => void | Promise<void>;
}

export default function GameDrawer({
    game,
    open,
    onClose,
    onEdit,
}: GameDrawerProps) {
    return (
        <DrawerShell
            open={open}
            title={game?.title ?? 'Game Details'}
            subtitle="Quick operational context for this game."
            meta={
                game
                    ? `Game • ${game.siteName} / ${game.eventName} / ${game.seasonName}`
                    : 'Game'
            }
            widthClassName="max-w-md"
            zIndexClassName="z-[70]"
            onClose={onClose}
        >
            {game ? (
                <div className="space-y-6">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="text-sm text-slate-600">Site</div>
                        <div className="mt-1 font-medium text-slate-900">
                            {game.siteName}
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="text-sm text-slate-600">Event</div>
                        <div className="mt-1 font-medium text-slate-900">
                            {game.eventName}
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="text-sm text-slate-600">Season</div>
                        <div className="mt-1 font-medium text-slate-900">
                            {game.seasonName}
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="text-sm text-slate-600">Scheduled For</div>
                            <div className="mt-1 font-medium text-slate-900">
                                {formatDateTime(game.scheduledFor)}
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="text-sm text-slate-600">Status</div>
                            <div className="mt-1 font-medium text-slate-900">
                                {game.status}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="text-sm text-slate-600">Join Code</div>
                        <div className="mt-1 font-mono font-medium text-slate-900">
                            {game.joinCode ?? 'Not generated'}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <ToolbarButton
                            label="Edit Game"
                            onClick={() => void onEdit(game)}
                            primary
                        />

                        <Link
                            href={`/admin/games/${game.id}/editor`}
                            className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                        >
                            Edit Rounds & Questions
                        </Link>

                        <Link
                            href={`/admin/games/${game.id}`}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                            Open Legacy Editor
                        </Link>
                    </div>
                </div>
            ) : null}
        </DrawerShell>
    );
}