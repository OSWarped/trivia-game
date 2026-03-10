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
import AppBackground from '@/components/AppBackground';

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
import EventModal from './components/EventModal';
import SeasonModal from './components/SeasonModal';
import AdminWorkspaceHeader from './components/AdminWorkspaceHeader';
import AdminWorkspaceTabs from './components/AdminWorkspaceTabs';
import AdminWorkspaceToolbar from './components/AdminWorkspaceToolbar';

import { useAdminWorkspaceData } from './hooks/useAdminWorkspaceData';
import { useAdminWorkspaceFilters } from './hooks/useAdminWorkspaceFilters';
import { useAdminWorkspaceUIState } from './hooks/useAdminWorkspaceUIState';

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
        selectedEventDetail,
        setSelectedEventDetail,
        selectedSeasonDetail,
        setSelectedSeasonDetail,

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

        eventName,
        setEventName,
        eventSiteId,
        setEventSiteId,
        eventSiteName,
        setEventSiteName,

        seasonName,
        setSeasonName,
        seasonStartsAt,
        setSeasonStartsAt,
        seasonEndsAt,
        setSeasonEndsAt,
        seasonActive,
        setSeasonActive,
        seasonEventId,
        setSeasonEventId,
        seasonEventName,
        setSeasonEventName,

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
        openEditEventModal,
        openEditSeasonModal,
        handleSaveSite,
        handleDeleteSite,
        handleSaveUser,
        handleDeleteUser,
        handleSaveGame,
        handleSaveEvent,
        handleSaveSeason,
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

        eventName,
        eventSiteId,

        seasonName,
        seasonStartsAt,
        seasonEndsAt,
        seasonActive,
        seasonEventId,

        setSites,
        setGames,
        setUsers,
        setSelectedGameDetail,
        setSelectedEventDetail,
        setSelectedSeasonDetail,

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

        setEventName,
        setEventSiteId,
        setEventSiteName,

        setSeasonName,
        setSeasonStartsAt,
        setSeasonEndsAt,
        setSeasonActive,
        setSeasonEventId,
        setSeasonEventName,

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

    const clearNestedBladeState = () => {
        setSelectedEventId(null);
        setSelectedSeasonId(null);
        setSelectedBladeGameId(null);
        setSelectedGame(null);
    };

    const handleSelectTab = (tab: AdminTab) => {
        setActiveTab(tab);
        setStatusFilter('ALL');
        clearNestedBladeState();

        if (tab !== 'sites') {
            setSelectedSite(null);
        }

        if (tab !== 'games') {
            setSelectedGame(null);
        }

        if (tab !== 'users') {
            setSelectedUser(null);
        }
    };

    const handleCloseSiteDrawer = () => {
        setSelectedSite(null);
        clearNestedBladeState();
    };

    const handleCloseEventDrawer = () => {
        setSelectedEventId(null);
        setSelectedSeasonId(null);
        setSelectedBladeGameId(null);
        setSelectedGame(null);
    };

    const handleCloseSeasonDrawer = () => {
        setSelectedSeasonId(null);
        setSelectedBladeGameId(null);
        setSelectedGame(null);
    };

    const handleCloseGameDrawer = () => {
        setSelectedGame(null);
        setSelectedBladeGameId(null);
    };

    const handleOpenEditGameModal = async (game: GameRow) => {
        setSelectedGame(null);
        setSelectedBladeGameId(null);
        await openEditGameModal(game);
        setModalType('edit-game');
    };

    const handleOpenEditEventModal = async (eventId: string) => {
        setSelectedEventId(null);
        await openEditEventModal(eventId);
        setModalType('edit-event');
    };

    const handleOpenEditSeasonModal = async (seasonId: string) => {
        setSelectedSeasonId(null);
        await openEditSeasonModal(seasonId);
        setModalType('edit-season');
    };

    const toolbarPrimaryAction = useMemo(() => {
        if (activeTab === 'sites') {
            return {
                label: 'Add Site',
                action: openAddSiteModal,
            };
        }

        if (activeTab === 'users') {
            return {
                label: 'Add User',
                action: openAddUserModal,
            };
        }

        return null;
    }, [activeTab, openAddSiteModal, openAddUserModal]);

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
                game.status === 'SCHEDULED' ||
                game.status === 'LIVE' ||
                game.status === 'DRAFT';

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
        if (!authChecked || loading) {
            return (
                <AppBackground variant="dashboard">
                    <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
                        <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
                            Loading workspace...
                        </div>
                    </div>
                </AppBackground>
            );
        }
    }

    return (
        <AppBackground variant="dashboard">
            <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <AdminWorkspaceHeader
                        activeTab={activeTab}
                        onAddSite={openAddSiteModal}
                        onRefresh={() => void loadWorkspaceData()}
                        onAddUser={openAddUserModal}
                        refreshing={refreshing}
                    />

                    {error ? (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                            {error}
                        </div>
                    ) : null}

                    <div className="rounded-2xl border border-white/10 bg-white/80 p-4 shadow-xl backdrop-blur-sm">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <AdminWorkspaceTabs
                                activeTab={activeTab}
                                onSelectTab={handleSelectTab}
                            />

                            <AdminWorkspaceToolbar
                                activeTab={activeTab}
                                searchTerm={searchTerm}
                                onChangeSearchTerm={setSearchTerm}
                                statusFilter={statusFilter}
                                onChangeStatusFilter={setStatusFilter}
                                searchPlaceholder={toolbarConfig.placeholder}
                                primaryLabel={toolbarPrimaryAction?.label}
                                onPrimaryAction={toolbarPrimaryAction?.action}
                            />
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
                    onClose={handleCloseSiteDrawer}
                    onEdit={openEditSiteModal}
                    events={selectedSiteEvents}
                    onOpenEvent={(eventId) => setSelectedEventId(eventId)}
                />

                <EventDrawer
                    eventId={selectedEventId}
                    open={Boolean(selectedEventId)}
                    onClose={handleCloseEventDrawer}
                    onEdit={handleOpenEditEventModal}
                    onOpenSeason={(seasonId) => setSelectedSeasonId(seasonId)}
                    onOpenGame={(gameId) => setSelectedBladeGameId(gameId)}
                />

                <SeasonDrawer
                    seasonId={selectedSeasonId}
                    open={Boolean(selectedSeasonId)}
                    onClose={handleCloseSeasonDrawer}
                    onEdit={handleOpenEditSeasonModal}
                    onOpenGame={(gameId) => setSelectedBladeGameId(gameId)}
                />

                <GameDrawer
                    game={selectedGame}
                    open={Boolean(selectedGame)}
                    onClose={handleCloseGameDrawer}
                    onEdit={handleOpenEditGameModal}
                />

                <UserDrawer
                    user={selectedUser}
                    open={Boolean(selectedUser)}
                    onClose={() => setSelectedUser(null)}
                    onEdit={openEditUserModal}
                />

                <SiteModal
                    open={modalType === 'add-site' || modalType === 'edit-site'}
                    mode={modalType === 'edit-site' ? 'edit' : 'add'}
                    siteName={siteName}
                    siteAddress={siteAddress}
                    saving={saving}
                    onClose={closeModal}
                    onChangeName={setSiteName}
                    onChangeAddress={setSiteAddress}
                    onSave={() => handleSaveSite(closeModal)}
                />

                <UserModal
                    open={modalType === 'add-user' || modalType === 'edit-user'}
                    mode={modalType === 'edit-user' ? 'edit' : 'add'}
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

                <EventModal
                    open={modalType === 'edit-event'}
                    eventName={eventName}
                    eventSiteId={eventSiteId}
                    eventSiteName={eventSiteName}
                    sites={sites}
                    saving={saving}
                    onClose={closeModal}
                    onChangeName={setEventName}
                    onChangeSiteId={setEventSiteId}
                    onSave={() => handleSaveEvent(closeModal, selectedEventDetail)}
                />

                <SeasonModal
                    open={modalType === 'edit-season'}
                    seasonName={seasonName}
                    seasonStartsAt={seasonStartsAt}
                    seasonEndsAt={seasonEndsAt}
                    seasonActive={seasonActive}
                    seasonEventName={seasonEventName}
                    saving={saving}
                    onClose={closeModal}
                    onChangeName={setSeasonName}
                    onChangeStartsAt={setSeasonStartsAt}
                    onChangeEndsAt={setSeasonEndsAt}
                    onChangeActive={setSeasonActive}
                    onSave={() => handleSaveSeason(closeModal, selectedSeasonDetail)}
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
        </AppBackground>
    );

}