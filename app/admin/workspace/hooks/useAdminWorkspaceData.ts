'use client';

import { useCallback, useState } from 'react';
import type {
  SiteRow,
  SiteGroup,
  GameRow,
  GameDetail,
  UserRow,
  EventDetail,
  SeasonDetail,
  ModalType,
} from '../types/workspace.types';
import {
  flattenGames,
  normalizeSiteRows,
  toDateTimeLocal,
} from '../utils/workspace.helpers';

interface UseAdminWorkspaceDataArgs {
  selectedSite: SiteRow | null;
  selectedGame: GameRow | null;
  selectedUser: UserRow | null;
  modalType: ModalType;

  siteName: string;
  siteAddress: string;

  userName: string;
  userEmail: string;
  userRole: string;
  userPassword: string;

  gameTitle: string;
  gameScheduledFor: string;
  gameHostId: string;
  gameStatus: string;
  gameSpecial: boolean;
  gameTag: string;

  eventName: string;
  eventSiteId: string;

  seasonName: string;
  seasonStartsAt: string;
  seasonEndsAt: string;
  seasonActive: boolean;
  seasonEventId: string;

  setSites: React.Dispatch<React.SetStateAction<SiteRow[]>>;
  setGames: React.Dispatch<React.SetStateAction<GameRow[]>>;
  setUsers: React.Dispatch<React.SetStateAction<UserRow[]>>;

  setSelectedGameDetail: React.Dispatch<React.SetStateAction<GameDetail | null>>;
  setSelectedEventDetail: React.Dispatch<React.SetStateAction<EventDetail | null>>;
  setSelectedSeasonDetail: React.Dispatch<
    React.SetStateAction<SeasonDetail | null>
  >;

  setSiteName: React.Dispatch<React.SetStateAction<string>>;
  setSiteAddress: React.Dispatch<React.SetStateAction<string>>;

  setUserName: React.Dispatch<React.SetStateAction<string>>;
  setUserEmail: React.Dispatch<React.SetStateAction<string>>;
  setUserRole: React.Dispatch<React.SetStateAction<string>>;
  setUserPassword: React.Dispatch<React.SetStateAction<string>>;

  setGameTitle: React.Dispatch<React.SetStateAction<string>>;
  setGameScheduledFor: React.Dispatch<React.SetStateAction<string>>;
  setGameHostId: React.Dispatch<React.SetStateAction<string>>;
  setGameStatus: React.Dispatch<React.SetStateAction<string>>;
  setGameSpecial: React.Dispatch<React.SetStateAction<boolean>>;
  setGameTag: React.Dispatch<React.SetStateAction<string>>;

  setEventName: React.Dispatch<React.SetStateAction<string>>;
  setEventSiteId: React.Dispatch<React.SetStateAction<string>>;
  setEventSiteName: React.Dispatch<React.SetStateAction<string>>;

  setSeasonName: React.Dispatch<React.SetStateAction<string>>;
  setSeasonStartsAt: React.Dispatch<React.SetStateAction<string>>;
  setSeasonEndsAt: React.Dispatch<React.SetStateAction<string>>;
  setSeasonActive: React.Dispatch<React.SetStateAction<boolean>>;
  setSeasonEventId: React.Dispatch<React.SetStateAction<string>>;
  setSeasonEventName: React.Dispatch<React.SetStateAction<string>>;

  setSelectedSite: React.Dispatch<React.SetStateAction<SiteRow | null>>;
  setSelectedGame: React.Dispatch<React.SetStateAction<GameRow | null>>;
  setSelectedUser: React.Dispatch<React.SetStateAction<UserRow | null>>;
}

export function useAdminWorkspaceData({
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
}: UseAdminWorkspaceDataArgs) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadWorkspaceData = useCallback(async () => {
    try {
      setError('');
      setRefreshing(true);

      const [sitesRes, gamesRes, usersRes] = await Promise.all([
        fetch('/api/admin/sites', { cache: 'no-store' }),
        fetch('/api/admin/games', { cache: 'no-store' }),
        fetch('/api/admin/users', { cache: 'no-store' }),
      ]);

      if (!sitesRes.ok) {
        const data = (await sitesRes.json()) as { error?: string };
        throw new Error(data.error ?? 'Failed to load sites.');
      }

      if (!gamesRes.ok) {
        const data = (await gamesRes.json()) as { error?: string };
        throw new Error(data.error ?? 'Failed to load games.');
      }

      if (!usersRes.ok) {
        const data = (await usersRes.json()) as { error?: string };
        throw new Error(data.error ?? 'Failed to load users.');
      }

      const sitesData = (await sitesRes.json()) as SiteRow[];
      const siteGroups = (await gamesRes.json()) as SiteGroup[];
      const usersData = (await usersRes.json()) as UserRow[];

      setSites(normalizeSiteRows(siteGroups, sitesData));
      setGames(flattenGames(siteGroups));
      setUsers(usersData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load workspace.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setSites, setGames, setUsers]);

  const openEditGameModal = useCallback(
    async (game: GameRow) => {
      try {
        setSaving(true);

        const res = await fetch(`/api/admin/games/${game.id}`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? 'Failed to load game details.');
        }

        const detail = (await res.json()) as GameDetail;

        setSelectedGame(game);
        setSelectedGameDetail(detail);

        setGameTitle(detail.title);
        setGameScheduledFor(toDateTimeLocal(detail.scheduledFor));
        setGameHostId(detail.host?.id ?? '');
        setGameStatus(detail.status);
        setGameSpecial(detail.special);
        setGameTag(detail.tag ?? '');
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Failed to load game.');
      } finally {
        setSaving(false);
      }
    },
    [
      setSelectedGame,
      setSelectedGameDetail,
      setGameTitle,
      setGameScheduledFor,
      setGameHostId,
      setGameStatus,
      setGameSpecial,
      setGameTag,
    ]
  );

  const openEditEventModal = useCallback(
    async (eventId: string) => {
      try {
        setSaving(true);

        const res = await fetch(`/api/admin/events/${eventId}`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? 'Failed to load event details.');
        }

        const detail = (await res.json()) as EventDetail;

        setSelectedEventDetail(detail);
        setEventName(detail.name);
        setEventSiteId(detail.site.id);
        setEventSiteName(detail.site.name);
      } catch (err) {
        window.alert(
          err instanceof Error ? err.message : 'Failed to load event.'
        );
      } finally {
        setSaving(false);
      }
    },
    [
      setSelectedEventDetail,
      setEventName,
      setEventSiteId,
      setEventSiteName,
    ]
  );

  const openEditSeasonModal = useCallback(
    async (seasonId: string) => {
      try {
        setSaving(true);

        const res = await fetch(`/api/admin/seasons/${seasonId}`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? 'Failed to load season details.');
        }

        const detail = (await res.json()) as SeasonDetail;

        setSelectedSeasonDetail(detail);
        setSeasonName(detail.name);
        setSeasonStartsAt(toDateTimeLocal(detail.startsAt));
        setSeasonEndsAt(toDateTimeLocal(detail.endsAt));
        setSeasonActive(detail.active);
        setSeasonEventId(detail.event.id);
        setSeasonEventName(detail.event.name);
      } catch (err) {
        window.alert(
          err instanceof Error ? err.message : 'Failed to load season.'
        );
      } finally {
        setSaving(false);
      }
    },
    [
      setSelectedSeasonDetail,
      setSeasonName,
      setSeasonStartsAt,
      setSeasonEndsAt,
      setSeasonActive,
      setSeasonEventId,
      setSeasonEventName,
    ]
  );

  const handleSaveSite = useCallback(
    async (closeModal: () => void) => {
      try {
        setSaving(true);

        const body = {
          name: siteName.trim(),
          address: siteAddress.trim() || '',
        };

        if (!body.name) {
          window.alert('Site name is required.');
          return;
        }

        if (modalType === 'add-site') {
          const res = await fetch('/api/admin/sites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

          if (!res.ok) {
            const data = (await res.json()) as { error?: string };
            throw new Error(data.error ?? 'Failed to create site.');
          }
        }

        if (modalType === 'edit-site' && selectedSite) {
          const res = await fetch(`/api/admin/sites/${selectedSite.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

          if (!res.ok) {
            const data = (await res.json()) as { error?: string };
            throw new Error(data.error ?? 'Failed to update site.');
          }
        }

        closeModal();
        await loadWorkspaceData();
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Failed to save site.');
      } finally {
        setSaving(false);
      }
    },
    [siteName, siteAddress, modalType, selectedSite, loadWorkspaceData]
  );

  const handleDeleteSite = useCallback(
    async (site: SiteRow) => {
      if (!window.confirm(`Delete ${site.name}?`)) return;

      try {
        const res = await fetch(`/api/admin/sites/${site.id}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? 'Failed to delete site.');
        }

        if (selectedSite?.id === site.id) {
          setSelectedSite(null);
        }

        await loadWorkspaceData();
      } catch (err) {
        window.alert(
          err instanceof Error ? err.message : 'Failed to delete site.'
        );
      }
    },
    [selectedSite, setSelectedSite, loadWorkspaceData]
  );

  const handleSaveUser = useCallback(
    async (closeModal: () => void) => {
      try {
        setSaving(true);

        if (!userName.trim() || !userEmail.trim()) {
          window.alert('Name and email are required.');
          return;
        }

        if (modalType === 'add-user' && !userPassword.trim()) {
          window.alert('Password is required for new users.');
          return;
        }

        if (modalType === 'add-user') {
          const res = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: userName.trim(),
              email: userEmail.trim(),
              role: userRole,
              password: userPassword,
            }),
          });

          if (!res.ok) {
            const data = (await res.json()) as { error?: string };
            throw new Error(data.error ?? 'Failed to create user.');
          }
        }

        if (modalType === 'edit-user' && selectedUser) {
          const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: userName.trim(),
              email: userEmail.trim(),
              role: userRole,
            }),
          });

          if (!res.ok) {
            const data = (await res.json()) as { error?: string };
            throw new Error(data.error ?? 'Failed to update user.');
          }
        }

        closeModal();
        await loadWorkspaceData();
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Failed to save user.');
      } finally {
        setSaving(false);
      }
    },
    [
      userName,
      userEmail,
      userRole,
      userPassword,
      modalType,
      selectedUser,
      loadWorkspaceData,
    ]
  );

  const handleDeleteUser = useCallback(
    async (user: UserRow) => {
      if (!window.confirm(`Delete ${user.name ?? user.email}?`)) return;

      try {
        const res = await fetch(`/api/admin/users/${user.id}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? 'Failed to delete user.');
        }

        if (selectedUser?.id === user.id) {
          setSelectedUser(null);
        }

        await loadWorkspaceData();
      } catch (err) {
        window.alert(
          err instanceof Error ? err.message : 'Failed to delete user.'
        );
      }
    },
    [selectedUser, setSelectedUser, loadWorkspaceData]
  );

  const handleSaveGame = useCallback(
    async (closeModal: () => void, selectedGameDetail: GameDetail | null) => {
      if (!selectedGameDetail) return;

      try {
        setSaving(true);

        if (!gameTitle.trim()) {
          window.alert('Game title is required.');
          return;
        }

        const res = await fetch(`/api/admin/games/${selectedGameDetail.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: gameTitle.trim(),
            scheduledFor: gameScheduledFor || null,
            hostId: gameHostId || null,
            special: gameSpecial,
            tag: gameSpecial ? gameTag.trim() || null : null,
            status: gameStatus,
          }),
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? 'Failed to update game.');
        }

        closeModal();
        setSelectedGameDetail(null);
        await loadWorkspaceData();
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Failed to save game.');
      } finally {
        setSaving(false);
      }
    },
    [
      gameTitle,
      gameScheduledFor,
      gameHostId,
      gameStatus,
      gameSpecial,
      gameTag,
      setSelectedGameDetail,
      loadWorkspaceData,
    ]
  );

  const handleSaveEvent = useCallback(
    async (closeModal: () => void, selectedEventDetail: EventDetail | null) => {
      if (!selectedEventDetail) return;

      try {
        setSaving(true);

        if (!eventName.trim()) {
          window.alert('Event name is required.');
          return;
        }

        const res = await fetch(`/api/admin/events/${selectedEventDetail.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: eventName.trim(),
            siteId: eventSiteId || null,
          }),
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? 'Failed to update event.');
        }

        closeModal();
        setSelectedEventDetail(null);
        await loadWorkspaceData();
      } catch (err) {
        window.alert(
          err instanceof Error ? err.message : 'Failed to save event.'
        );
      } finally {
        setSaving(false);
      }
    },
    [eventName, eventSiteId, setSelectedEventDetail, loadWorkspaceData]
  );

  const handleSaveSeason = useCallback(
    async (
      closeModal: () => void,
      selectedSeasonDetail: SeasonDetail | null
    ) => {
      if (!selectedSeasonDetail) return;

      try {
        setSaving(true);

        if (!seasonName.trim()) {
          window.alert('Season name is required.');
          return;
        }

        const res = await fetch(`/api/admin/seasons/${selectedSeasonDetail.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: seasonName.trim(),
            startsAt: seasonStartsAt || null,
            endsAt: seasonEndsAt || null,
            active: seasonActive,
            eventId: seasonEventId || null,
          }),
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? 'Failed to update season.');
        }

        closeModal();
        setSelectedSeasonDetail(null);
        await loadWorkspaceData();
      } catch (err) {
        window.alert(
          err instanceof Error ? err.message : 'Failed to save season.'
        );
      } finally {
        setSaving(false);
      }
    },
    [
      seasonName,
      seasonStartsAt,
      seasonEndsAt,
      seasonActive,
      seasonEventId,
      setSelectedSeasonDetail,
      loadWorkspaceData,
    ]
  );

  const handleDeleteGame = useCallback(
    async (game: GameRow) => {
      if (!window.confirm(`Delete ${game.title}?`)) return;

      try {
        const res = await fetch(`/api/admin/games/${game.id}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? 'Failed to delete game.');
        }

        if (selectedGame?.id === game.id) {
          setSelectedGame(null);
        }

        await loadWorkspaceData();
      } catch (err) {
        window.alert(
          err instanceof Error ? err.message : 'Failed to delete game.'
        );
      }
    },
    [selectedGame, setSelectedGame, loadWorkspaceData]
  );

  return {
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
  };
}