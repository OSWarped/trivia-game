'use client';

import { useState } from 'react';
import type {
  ModalType,
  SiteRow,
  GameRow,
  GameDetail,
  UserRow,
} from '../types/workspace.types';

export function useAdminWorkspaceUIState() {
  const [selectedSite, setSelectedSite] = useState<SiteRow | null>(null);
  const [selectedGame, setSelectedGame] = useState<GameRow | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [selectedGameDetail, setSelectedGameDetail] =
    useState<GameDetail | null>(null);

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

  const closeModal = () => {
    setModalType(null);
    resetSiteForm();
    resetUserForm();
    resetGameForm();
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

    resetSiteForm,
    resetUserForm,
    resetGameForm,
    closeModal,
    openAddSiteModal,
    openEditSiteModal,
    openAddUserModal,
    openEditUserModal,
  };
}