'use client';

import { useState } from 'react';
import type {
  ModalType,
  SiteRow,
  GameRow,
  GameDetail,
  UserRow,
  EventDetail,
  SeasonDetail,
} from '../types/workspace.types';

export function useAdminWorkspaceUIState() {
  const [selectedSite, setSelectedSite] = useState<SiteRow | null>(null);
  const [selectedGame, setSelectedGame] = useState<GameRow | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

  const [selectedGameDetail, setSelectedGameDetail] =
    useState<GameDetail | null>(null);
  const [selectedEventDetail, setSelectedEventDetail] =
    useState<EventDetail | null>(null);
  const [selectedSeasonDetail, setSelectedSeasonDetail] =
    useState<SeasonDetail | null>(null);

  const [modalType, setModalType] = useState<ModalType>(null);

  const [siteName, setSiteName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('HOST');
  const [userPassword, setUserPassword] = useState('');

  const [gameTitle, setGameTitle] = useState('');
  const [gameScheduledFor, setGameScheduledFor] = useState('');
  const [gameHostId, setGameHostId] = useState('');
  const [gameStatus, setGameStatus] = useState('DRAFT');
  const [gameSpecial, setGameSpecial] = useState(false);
  const [gameTag, setGameTag] = useState('');

  const [eventName, setEventName] = useState('');
  const [eventSiteId, setEventSiteId] = useState('');
  const [eventSiteName, setEventSiteName] = useState('');

  const [seasonName, setSeasonName] = useState('');
  const [seasonStartsAt, setSeasonStartsAt] = useState('');
  const [seasonEndsAt, setSeasonEndsAt] = useState('');
  const [seasonActive, setSeasonActive] = useState(true);
  const [seasonEventId, setSeasonEventId] = useState('');
  const [seasonEventName, setSeasonEventName] = useState('');

  const resetSiteForm = () => {
    setSiteName('');
    setSiteAddress('');
  };

  const resetUserForm = () => {
    setUserName('');
    setUserEmail('');
    setUserRole('HOST');
    setUserPassword('');
  };

  const resetGameForm = () => {
    setGameTitle('');
    setGameScheduledFor('');
    setGameHostId('');
    setGameStatus('DRAFT');
    setGameSpecial(false);
    setGameTag('');
  };

  const resetEventForm = () => {
    setEventName('');
    setEventSiteId('');
    setEventSiteName('');
  };

  const resetSeasonForm = () => {
    setSeasonName('');
    setSeasonStartsAt('');
    setSeasonEndsAt('');
    setSeasonActive(true);
    setSeasonEventId('');
    setSeasonEventName('');
  };

  const closeModal = () => {
    setModalType(null);

    setSelectedGameDetail(null);
    setSelectedEventDetail(null);
    setSelectedSeasonDetail(null);

    resetSiteForm();
    resetUserForm();
    resetGameForm();
    resetEventForm();
    resetSeasonForm();
  };

  const openAddSiteModal = () => {
    resetSiteForm();
    setModalType('add-site');
  };

  const openEditSiteModal = (site: SiteRow) => {
    setSelectedSite(null);
    setSiteName(site.name);
    setSiteAddress(site.address ?? '');
    setModalType('edit-site');
  };

  const openAddUserModal = () => {
    resetUserForm();
    setModalType('add-user');
  };

  const openEditUserModal = (user: UserRow) => {
    setSelectedUser(null);
    setUserName(user.name ?? '');
    setUserEmail(user.email);
    setUserRole(user.role ?? 'HOST');
    setUserPassword('');
    setModalType('edit-user');
  };

  return {
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

    resetSiteForm,
    resetUserForm,
    resetGameForm,
    resetEventForm,
    resetSeasonForm,
    closeModal,
    openAddSiteModal,
    openEditSiteModal,
    openAddUserModal,
    openEditUserModal,
  };
}