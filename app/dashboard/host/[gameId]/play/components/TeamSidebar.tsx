'use client'

import React from 'react'

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

export default function TeamSidebar({ teamStatus }: TeamSidebarProps) {
  

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
    </>
  )
}
