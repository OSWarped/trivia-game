'use client'

import React, { useState } from 'react'

export interface TeamStatus {
  id: string
  name: string
  score?: number
  submitted: boolean
}

interface TeamSidebarProps {
  teamStatus: TeamStatus[]
  onRequestLiveTeams: () => void
}

export default function TeamSidebar({ teamStatus, onRequestLiveTeams }: TeamSidebarProps) {
  const [showTeams, setShowTeams] = useState(false)

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 border-r bg-gray-100 p-4 shadow-inner">
        <h2 className="mb-4 text-lg font-semibold text-gray-700">👥 Teams</h2>
        <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-4rem)]">
          {teamStatus.map(team => (
            <div
              key={team.id}
              className={`flex items-center justify-between rounded-lg border bg-white p-3 shadow-sm ${
                team.submitted
                  ? 'border-green-400 ring-2 ring-green-300'
                  : ''
              }`}
            >
              <span className="font-medium text-gray-800">
                {team.name}
                {team.submitted && (
                  <span className="ml-2 rounded bg-green-200 px-2 text-xs font-semibold text-green-800">
                    Submitted
                  </span>
                )}
              </span>
              <span className="text-sm font-bold text-blue-600">{team.score ?? 0} pts</span>
            </div>
          ))}
        </div>
      </aside>

      {/* Mobile Toggle Bar */}
      <div className="md:hidden p-2 bg-white shadow flex justify-between items-center">
        <button
          onClick={() => setShowTeams(prev => !prev)}
          className="text-blue-600 underline text-sm"
        >
          {showTeams ? 'Hide Teams' : 'Show Teams'}
        </button>
        <button
          onClick={onRequestLiveTeams}
          className="text-gray-600 text-sm"
        >
          Refresh
        </button>
      </div>

      {/* Mobile Drawer */}
      {showTeams && (
        <div className="md:hidden bg-white border-b p-2 shadow-inner">
          <div className="space-y-2">
            {teamStatus.map(team => (
              <div
                key={team.id}
                className="flex justify-between items-center border-b py-1 text-sm"
              >
                <span>{team.name}</span>
                <span>{team.score ?? 0} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
