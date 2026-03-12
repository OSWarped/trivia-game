'use client';

import React, { useState } from 'react';
import ImportPreviewPanel, {
    ImportPreviewData,
} from './ImportPreviewPanel';

interface GameJsonImportPanelProps {
    gameId: string;
}

interface PreviewResponse {
    ok: boolean;
    error?: string;
    errors?: string[];
    warnings?: string[];
    summary?: {
        roundCount: number;
        questionCount: number;
        optionCount: number;
    } | null;
    preview?: ImportPreviewData | null;
}

interface CommitResponse {
    ok: boolean;
    error?: string;
    errors?: string[];
    warnings?: string[];
    summary?: {
        roundCount: number;
        questionCount: number;
        optionCount: number;
    } | null;
}

export default function GameJsonImportPanel({
    gameId,
}: GameJsonImportPanelProps) {
    const [jsonText, setJsonText] = useState('');
    const [previewResult, setPreviewResult] = useState<PreviewResponse | null>(null);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [topLevelError, setTopLevelError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleLoadTemplate = async () => {
        setTopLevelError('');
        setSuccessMessage('');

        try {
            const res = await fetch(`/api/host/games/${gameId}/export-template`, {
                cache: 'no-store',
            });

            const data = (await res.json()) as Record<string, unknown>;

            if (!res.ok) {
                setTopLevelError(
                    typeof data.error === 'string'
                        ? data.error
                        : 'Failed to export template.'
                );
                return;
            }

            const formatted = JSON.stringify(data, null, 2);
            setJsonText(formatted);

            const previewRes = await fetch(`/api/host/games/${gameId}/import/preview`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const previewData = (await previewRes.json()) as PreviewResponse;
            setPreviewResult(previewData);

            if (!previewRes.ok && previewData.error) {
                setTopLevelError(previewData.error);
            }
        } catch (error) {
            setTopLevelError(
                error instanceof Error ? error.message : 'Failed to export template.'
            );
        }
    };

    const handlePreview = async () => {
        setIsPreviewing(true);
        setTopLevelError('');
        setSuccessMessage('');
        setPreviewResult(null);

        try {
            let parsed: unknown;

            try {
                parsed = JSON.parse(jsonText);
            } catch {
                setTopLevelError('JSON is not valid. Fix the syntax and try again.');
                return;
            }

            const res = await fetch(`/api/host/games/${gameId}/import/preview`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(parsed),
            });

            const data = (await res.json()) as PreviewResponse;
            setPreviewResult(data);

            if (!res.ok && data.error) {
                setTopLevelError(data.error);
            }
        } catch (error) {
            setTopLevelError(
                error instanceof Error ? error.message : 'Failed to preview import.'
            );
        } finally {
            setIsPreviewing(false);
        }
    };

    const handleImport = async () => {
        setIsImporting(true);
        setTopLevelError('');
        setSuccessMessage('');

        try {
            let parsed: unknown;

            try {
                parsed = JSON.parse(jsonText);
            } catch {
                setTopLevelError('JSON is not valid. Fix the syntax and try again.');
                return;
            }

            const res = await fetch(`/api/host/games/${gameId}/import/commit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(parsed),
            });

            const data = (await res.json()) as CommitResponse;

            if (!res.ok || !data.ok) {
                setTopLevelError(data.error || 'Failed to import game content.');
                return;
            }

            setSuccessMessage(
                `Imported ${data.summary?.roundCount ?? 0} rounds, ${data.summary?.questionCount ?? 0
                } questions, and ${data.summary?.optionCount ?? 0} options.`
            );
        } catch (error) {
            setTopLevelError(
                error instanceof Error ? error.message : 'Failed to import game content.'
            );
        } finally {
            setIsImporting(false);
        }
    };

    const canImport =
        !!previewResult &&
        previewResult.ok &&
        !!previewResult.preview &&
        !isPreviewing &&
        !isImporting;

    return (
        <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                        Clone / Import Game JSON
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                        Export this game as reusable JSON, inspect it, modify it manually or with AI,
                        then preview and import it back into this game or another one.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={() => void handleLoadTemplate()}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                        Clone / Export JSON
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            if (!jsonText.trim()) return;
                            void navigator.clipboard.writeText(jsonText);
                        }}
                        disabled={!jsonText.trim()}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Copy JSON
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                <label
                    htmlFor="game-json-import"
                    className="text-sm font-medium text-slate-700"
                >
                    Game JSON
                </label>
                <textarea
                    id="game-json-import"
                    value={jsonText}
                    onChange={(e) => {
                        setJsonText(e.target.value);
                        setPreviewResult(null);
                        setTopLevelError('');
                        setSuccessMessage('');
                    }}
                    placeholder="Paste exported or AI-generated game JSON here..."
                    className="min-h-[320px] w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white"
                    spellCheck={false}
                />
            </div>

            {topLevelError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {topLevelError}
                </div>
            ) : null}

            {successMessage ? (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {successMessage}
                </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
                <button
                    type="button"
                    onClick={() => void handlePreview()}
                    disabled={isPreviewing || isImporting || !jsonText.trim()}
                    className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isPreviewing ? 'Previewing...' : 'Preview Import'}
                </button>

                <button
                    type="button"
                    onClick={() => void handleImport()}
                    disabled={!canImport}
                    className="rounded-lg border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isImporting ? 'Importing...' : 'Import Game Content'}
                </button>
            </div>

            {previewResult ? (
                <ImportPreviewPanel
                    ok={previewResult.ok}
                    errors={previewResult.errors ?? []}
                    warnings={previewResult.warnings ?? []}
                    summary={previewResult.summary ?? null}
                    preview={previewResult.preview ?? null}
                />
            ) : null}
        </section>
    );
}