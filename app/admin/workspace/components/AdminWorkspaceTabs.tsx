'use client';

import React from 'react';
import type { AdminTab } from '../types/workspace.types';
import TabButton from './ui/TabButton';

interface AdminWorkspaceTabsProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
}

export default function AdminWorkspaceTabs({
  activeTab,
  onSelectTab,
}: AdminWorkspaceTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <TabButton
        label="Sites"
        active={activeTab === 'sites'}
        onClick={() => onSelectTab('sites')}
      />
      <TabButton
        label="Games"
        active={activeTab === 'games'}
        onClick={() => onSelectTab('games')}
      />
      <TabButton
        label="Users"
        active={activeTab === 'users'}
        onClick={() => onSelectTab('users')}
      />
    </div>
  );
}