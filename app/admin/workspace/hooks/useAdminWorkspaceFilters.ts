'use client';

import { useMemo } from 'react';
import type {
  AdminTab,
  SiteRow,
  GameRow,
  UserRow,
} from '../types/workspace.types';

interface UseAdminWorkspaceFiltersArgs {
  activeTab: AdminTab;
  searchTerm: string;
  statusFilter: string;
  sites: SiteRow[];
  games: GameRow[];
  users: UserRow[];
  onOpenAddSite: () => void;
  onOpenAddUser: () => void;
  onRefresh: () => void | Promise<void>;
}

export function useAdminWorkspaceFilters({
  activeTab,
  searchTerm,
  statusFilter,
  sites,
  games,
  users,
  onOpenAddSite,
  onOpenAddUser,
  onRefresh,
}: UseAdminWorkspaceFiltersArgs) {
  const filteredSites = useMemo(() => {
    return sites.filter((site) => {
      const matchesSearch =
        site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (site.address ?? '').toLowerCase().includes(searchTerm.toLowerCase());

      const normalizedStatus = site.status ?? 'ACTIVE';
      const matchesStatus =
        statusFilter === 'ALL' || normalizedStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [sites, searchTerm, statusFilter]);

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const matchesSearch =
        game.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        game.siteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        game.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (game.joinCode ?? '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' || game.status.toUpperCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [games, searchTerm, statusFilter]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        (user.name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' || statusFilter === 'ACTIVE';

      return matchesSearch && matchesStatus;
    });
  }, [users, searchTerm, statusFilter]);

  const toolbarConfig = useMemo(() => {
    switch (activeTab) {
      case 'sites':
        return {
          placeholder: 'Search sites by name or address',
          primaryLabel: 'Add Site',
          primaryAction: onOpenAddSite,
        };
      case 'games':
        return {
          placeholder: 'Search games by title, site, event, or join code',
          primaryLabel: 'Refresh Games',
          primaryAction: onRefresh,
        };
      case 'users':
        return {
          placeholder: 'Search users by name, email, or role',
          primaryLabel: 'Add User',
          primaryAction: onOpenAddUser,
        };
      default:
        return {
          placeholder: 'Search',
          primaryLabel: 'Add',
          primaryAction: () => undefined,
        };
    }
  }, [activeTab, onOpenAddSite, onOpenAddUser, onRefresh]);

  return {
    filteredSites,
    filteredGames,
    filteredUsers,
    toolbarConfig,
  };
}