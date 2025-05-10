'use client'

import React, { useState } from 'react'
import { TeamStatus } from './TeamSidebar'

interface TeamDrawerProps {
  teamStatus: TeamStatus[]
  onRequestLiveTeams: () => void
}

export default function TeamDrawer({ teamStatus, onRequestLiveTeams }: TeamDrawerProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Drawer Handle */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t shadow-lg p-2 flex justify-between items-center z-40">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex-1 text-center font-medium text-blue-600 z-50"
        >
          {open ? 'Hide Teams' : 'Show Teams'}
        </button>
        <button
          onClick={onRequestLiveTeams}
          className="text-sm text-gray-600 px-2 z-50"
        >
          Refresh
        </button>
      </div>

      {/* Sliding Drawer */}
      <div
        className={`fixed bottom-0 left-0 right-0 md:hidden bg-gray-100 shadow-lg transition-transform duration-300 z-30 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="p-2 space-y-2 max-h-[60vh] overflow-y-auto mb-16">
          {teamStatus.map(team => (
            <div
              key={team.id}
              className={`flex items-center justify-between rounded-lg border bg-white p-3 shadow-sm ${
                team.submitted ? 'border-green-400 ring-2 ring-green-300' : ''
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
      </div>
    </>
  )
}
