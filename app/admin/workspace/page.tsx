'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

import type {
    AdminTab,
    SiteRow,
    GameRow,
    UserRow,
} from './types/workspace.types';

import TabButton from './components/ui/TabButton';
import ToolbarButton from './components/ui/ToolbarButton';
import SitesPanel from './components/SitesPanel';
import GamesPanel from './components/GamesPanel';
import UsersPanel from './components/UsersPanel';
import SiteDrawer from './components/SiteDrawer';
import GameDrawer from './components/GameDrawer';
import UserDrawer from './components/UserDrawer';
import SiteModal from './components/SiteModal';
import UserModal from './components/UserModal';
import GameModal from './components/GameModal';
import EventDrawer from './components/EventDrawer';
import SeasonDrawer from './components/SeasonDrawer';
import { useAdminWorkspaceData } from './hooks/useAdminWorkspaceData';
import { useAdminWorkspaceFilters } from './hooks/useAdminWorkspaceFilters';
import { useAdminWorkspaceUIState } from './hooks/useAdminWorkspaceUIState.ts';

export default function AdminWorkspacePage() {
    const router = useRouter();
    const { isAdmin, loading: authLoading } = useAuth();

    const [authChecked, setAuthChecked] = useState(false);

    const [activeTab, setActiveTab] = useState<AdminTab>('sites');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const [sites, setSites] = useState<SiteRow[]>([]);
    const [games, setGames] = useState<GameRow[]>([]);
    const [users, setUsers] = useState<UserRow[]>([]);

    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
    const [selectedBladeGameId, setSelectedBladeGameId] = useState<string | null>(null);

    const {
        selectedSite,
        setSelectedSite,
        selectedGame,
        setSelectedGame,
        selectedUser,
        setSelectedUser,
        selectedGameDetail,
        setSelectedGameDetail,

        modalType,
        setModalType,

        siteName,
        setSiteName,
        siteAddress,
        setSiteAddress,

        userName,
        setUserName,
        userEmail,
        setUserEmail,
        userRole,
        setUserRole,
        userPassword,
        setUserPassword,

        gameTitle,
        setGameTitle,
        gameScheduledFor,
        setGameScheduledFor,
        gameHostId,
        setGameHostId,
        gameStatus,
        setGameStatus,
        gameSpecial,
        setGameSpecial,
        gameTag,
        setGameTag,

        closeModal,
        openAddSiteModal,
        openEditSiteModal,
        openAddUserModal,
        openEditUserModal,
    } = useAdminWorkspaceUIState();

    const {
        loading,
        refreshing,
        saving,
        error,
        loadWorkspaceData,
        openEditGameModal,
        handleSaveSite,
        handleDeleteSite,
        handleSaveUser,
        handleDeleteUser,
        handleSaveGame,
        handleDeleteGame,
    } = useAdminWorkspaceData({
        selectedSite,
        selectedGame,
        selectedUser,
        modalType,

        siteName,
        siteAddress,

        userName,
        userEmail,
        userRole,
        userPassword,

        gameTitle,
        gameScheduledFor,
        gameHostId,
        gameStatus,
        gameSpecial,
        gameTag,

        setSites,
        setGames,
        setUsers,
        setSelectedGameDetail,

        setSiteName,
        setSiteAddress,

        setUserName,
        setUserEmail,
        setUserRole,
        setUserPassword,

        setGameTitle,
        setGameScheduledFor,
        setGameHostId,
        setGameStatus,
        setGameSpecial,
        setGameTag,

        setSelectedSite,
        setSelectedGame,
        setSelectedUser,
    });

    useEffect(() => {
        if (authLoading) return;

        if (!isAdmin) {
            router.push('/login');
            return;
        }

        setAuthChecked(true);
    }, [authLoading, isAdmin, router]);

    useEffect(() => {
        if (!authChecked) return;
        void loadWorkspaceData();
    }, [authChecked, loadWorkspaceData]);

    useEffect(() => {
        if (!selectedBladeGameId) return;

        const match = games.find((game) => game.id === selectedBladeGameId);
        if (!match) return;

        setSelectedGame(match);
    }, [selectedBladeGameId, games, setSelectedGame]);

    <SeasonDrawer
        seasonId={selectedSeasonId}
        open={Boolean(selectedSeasonId)}
        onClose={() => {
            setSelectedSeasonId(null);
            setSelectedBladeGameId(null);
        }}
        onOpenGame={(gameId) => setSelectedBladeGameId(gameId)}
    />

    const handleOpenEditGameModal = async (game: GameRow) => {
        setSelectedGame(null);
        await openEditGameModal(game);
        setModalType('edit-game');
    };

    const {
        filteredSites,
        filteredGames,
        filteredUsers,
        toolbarConfig,
    } = useAdminWorkspaceFilters({
        activeTab,
        searchTerm,
        statusFilter,
        sites,
        games,
        users,
        onOpenAddSite: openAddSiteModal,
        onOpenAddUser: openAddUserModal,
        onRefresh: () => void loadWorkspaceData(),
    });

    const selectedSiteEvents = useMemo(() => {
        if (!selectedSite) return [];

        const siteGames = games.filter((game) => game.siteId === selectedSite.id);

        const byEvent = new Map<
            string,
            { id: string; name: string; upcomingGames: number }
        >();

        for (const game of siteGames) {
            const existing = byEvent.get(game.eventId);

            const isUpcoming =
                game.status === 'SCHEDULED' || game.status === 'LIVE' || game.status === 'DRAFT';

            if (existing) {
                existing.upcomingGames += isUpcoming ? 1 : 0;
            } else {
                byEvent.set(game.eventId, {
                    id: game.eventId,
                    name: game.eventName,
                    upcomingGames: isUpcoming ? 1 : 0,
                });
            }
        }

        return Array.from(byEvent.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [games, selectedSite]);

    if (!authChecked || loading) {
        return (
            <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-8">
                <div className="mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    Loading workspace...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <header className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                                Admin Workspace
                            </h1>
                            <p className="mt-1 text-sm text-slate-600">
                                Manage sites, games, and users from one scalable operations
                                console.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <ToolbarButton label="Add Site" onClick={openAddSiteModal} />
                            <ToolbarButton
                                label="Refresh"
                                onClick={() => void loadWorkspaceData()}
                                disabled={refreshing}
                            />
                            <ToolbarButton label="Add User" onClick={openAddUserModal} />
                        </div>
                    </div>
                </header>

                {error ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                        {error}
                    </div>
                ) : null}

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-wrap gap-2">
                            <TabButton
                                label="Sites"
                                active={activeTab === 'sites'}
                                onClick={() => {
                                    setActiveTab('sites');
                                    setSelectedGame(null);
                                    setSelectedUser(null);
                                }}
                            />
                            <TabButton
                                label="Games"
                                active={activeTab === 'games'}
                                onClick={() => {
                                    setActiveTab('games');
                                    setSelectedSite(null);
                                    setSelectedUser(null);
                                }}
                            />
                            <TabButton
                                label="Users"
                                active={activeTab === 'users'}
                                onClick={() => {
                                    setActiveTab('users');
                                    setSelectedSite(null);
                                    setSelectedGame(null);
                                }}
                            />
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={toolbarConfig.placeholder}
                                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                            />

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                                <option value="DRAFT">Draft</option>
                                <option value="SCHEDULED">Scheduled</option>
                                <option value="LIVE">Live</option>
                                <option value="CLOSED">Closed</option>
                            </select>

                            <ToolbarButton
                                label={toolbarConfig.primaryLabel}
                                onClick={toolbarConfig.primaryAction}
                                primary
                            />
                        </div>
                    </div>
                </div>

                {activeTab === 'sites' && (
                    <SitesPanel
                        sites={filteredSites}
                        onOpenDetails={setSelectedSite}
                        onEdit={openEditSiteModal}
                        onDelete={handleDeleteSite}
                    />
                )}

                {activeTab === 'games' && (
                    <GamesPanel
                        games={filteredGames}
                        onOpenDetails={setSelectedGame}
                        onEdit={handleOpenEditGameModal}
                        onDelete={handleDeleteGame}
                    />
                )}

                {activeTab === 'users' && (
                    <UsersPanel
                        users={filteredUsers}
                        onOpenDetails={setSelectedUser}
                        onEdit={openEditUserModal}
                        onDelete={handleDeleteUser}
                    />
                )}
            </div>

            <SiteDrawer
                site={selectedSite}
                open={Boolean(selectedSite)}
                onClose={() => {
                    setSelectedSite(null);
                    setSelectedEventId(null);
                    setSelectedSeasonId(null);
                }}
                onEdit={openEditSiteModal}
                events={selectedSiteEvents}
                onOpenEvent={(eventId) => setSelectedEventId(eventId)}
            />

            <EventDrawer
                eventId={selectedEventId}
                open={Boolean(selectedEventId)}
                onClose={() => {
                    setSelectedEventId(null);
                    setSelectedSeasonId(null);
                    setSelectedBladeGameId(null);
                }}
                onOpenSeason={(seasonId) => setSelectedSeasonId(seasonId)}
                onOpenGame={(gameId) => setSelectedBladeGameId(gameId)}
            />

            <SeasonDrawer
                seasonId={selectedSeasonId}
                open={Boolean(selectedSeasonId)}
                onClose={() => {
                    setSelectedSeasonId(null);
                    setSelectedBladeGameId(null);
                }}
                onOpenGame={(gameId) => setSelectedBladeGameId(gameId)}
            />

            <GameDrawer
                game={selectedGame}
                open={Boolean(selectedGame)}
                onClose={() => {
                    setSelectedGame(null);
                    setSelectedBladeGameId(null);
                }}
                onEdit={handleOpenEditGameModal}
            />

            <UserDrawer
                user={selectedUser}
                open={Boolean(selectedUser)}
                onClose={() => setSelectedUser(null)}
                onEdit={openEditUserModal}
            />

            <SiteModal
                open={modalType === 'add-site'}
                mode="add"
                siteName={siteName}
                siteAddress={siteAddress}
                saving={saving}
                onClose={closeModal}
                onChangeName={setSiteName}
                onChangeAddress={setSiteAddress}
                onSave={() => handleSaveSite(closeModal)}
            />

            <SiteModal
                open={modalType === 'edit-site'}
                mode="edit"
                siteName={siteName}
                siteAddress={siteAddress}
                saving={saving}
                onClose={closeModal}
                onChangeName={setSiteName}
                onChangeAddress={setSiteAddress}
                onSave={() => handleSaveSite(closeModal)}
            />

            <UserModal
                open={modalType === 'add-user'}
                mode="add"
                userName={userName}
                userEmail={userEmail}
                userRole={userRole}
                userPassword={userPassword}
                saving={saving}
                onClose={closeModal}
                onChangeName={setUserName}
                onChangeEmail={setUserEmail}
                onChangeRole={setUserRole}
                onChangePassword={setUserPassword}
                onSave={() => handleSaveUser(closeModal)}
            />

            <UserModal
                open={modalType === 'edit-user'}
                mode="edit"
                userName={userName}
                userEmail={userEmail}
                userRole={userRole}
                userPassword={userPassword}
                saving={saving}
                onClose={closeModal}
                onChangeName={setUserName}
                onChangeEmail={setUserEmail}
                onChangeRole={setUserRole}
                onChangePassword={setUserPassword}
                onSave={() => handleSaveUser(closeModal)}
            />

            <GameModal
                open={modalType === 'edit-game'}
                gameTitle={gameTitle}
                gameScheduledFor={gameScheduledFor}
                gameHostId={gameHostId}
                gameStatus={gameStatus}
                gameSpecial={gameSpecial}
                gameTag={gameTag}
                users={users}
                saving={saving}
                onClose={closeModal}
                onChangeTitle={setGameTitle}
                onChangeScheduledFor={setGameScheduledFor}
                onChangeHostId={setGameHostId}
                onChangeStatus={setGameStatus}
                onChangeSpecial={setGameSpecial}
                onChangeTag={setGameTag}
                onSave={() => handleSaveGame(closeModal, selectedGameDetail)}
            />
        </div>
    );
}