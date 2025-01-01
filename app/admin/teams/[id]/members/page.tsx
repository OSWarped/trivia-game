'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

interface Team {
  id: string;
  name: string;
  players: TeamMember[];
  captain: { id: string; name: string; email: string };
}

interface User {
  id: string;
  name: string;
  email: string;
}

export default function ManageTeamMembers() {
  const params = useParams();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamName, setTeamName] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [teamCaptainId, setTeamCaptainId] = useState<string | null>(null);

  const teamId = params?.id;

  useEffect(() => {
    if (!teamId) {
      setError('Invalid team ID');
      return;
    }
  
    async function fetchTeam() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/teams/${teamId}/members`);
        if (!res.ok) throw new Error('Failed to fetch team members');
        const teamData: Team = await res.json();
  
        // Extract and set team information
        setTeamName(teamData.name || 'Unknown Team');
        setTeamCaptainId(teamData.captain?.id || null); // Set the team captain ID
        setTeamMembers([
          ...(teamData.players || []),
          ...(teamData.captain
            ? [{ id: teamData.captain.id, name: teamData.captain.name, email: teamData.captain.email }]
            : []),
        ]);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
  
    async function fetchUsers() {
      try {
        const res = await fetch('/api/admin/users');
        if (!res.ok) throw new Error('Failed to fetch users');
        const usersData: User[] = await res.json();
        setUsers(usersData);
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    }
  
    fetchTeam();
    fetchUsers();
  }, [teamId]);
  

  async function handleAddMember() {
    if (!selectedUserId) {
      alert('Please select a user to add');
      return;
    }
  
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId }),
      });
  
      if (res.ok) {
        const updatedTeam = await res.json();
        setTeamMembers(updatedTeam.players);
        setSelectedUserId(''); // Reset selection
      } else {
        const { error } = await res.json();
        alert(error || 'Failed to add member');
      }
    } catch (err) {
      console.error('Error adding member:', err);
    }
  }
  
  async function handleRemoveMember(userId: string) {
    if (userId === teamCaptainId) {
      alert('You cannot remove the team captain');
      return;
    }
  
    try {
        const response = await fetch(`/api/admin/teams/${teamId}/members/${userId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: 'd190f451-c8f2-4268-8829-7d489d921b05' }), // Check if needed in your backend
          });
  
      if (response.ok) {
        setTeamMembers((prev) => prev.filter((member) => member.id !== userId));
      } else {
        alert('Failed to remove member');
      }
    } catch (err) {
      console.error('Error removing member:', err);
    }
  }
  

  if (loading) {
    return <div>Loading team members...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Team Members for {teamName}</h1>
      <button
        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mb-4"
        onClick={() => setShowAddModal(true)}
      >
        Add Member
      </button>
      <ul className="space-y-4">
  {teamMembers.map((member) => (
    <li
      key={member.id}
      className="flex justify-between items-center bg-white p-4 rounded shadow-md"
    >
      <div>
        <span className="font-bold">{member.name}</span>
        <span className="ml-2 text-sm text-gray-500">
          {member.id === teamCaptainId ? '(Captain)' : ''}
        </span>
      </div>
      <button
        className={`bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 ${
          member.id === teamCaptainId ? 'cursor-not-allowed opacity-50' : ''
        }`}
        onClick={() => handleRemoveMember(member.id)}
        disabled={member.id === teamCaptainId} // Prevent removing captain
      >
        Remove
      </button>
    </li>
  ))}
</ul>


      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded shadow-md w-1/2">
          <h2 className="text-xl font-bold mb-4">Add Member to {teamName}</h2>
          <div className="space-y-4">
            <label className="block font-medium mb-1">Select User</label>
            <select
              className="border border-gray-300 p-2 rounded w-full"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">Select a user</option>
              {users
                .filter((user) => !teamMembers.some((member) => member.id === user.id))
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
            </select>
          </div>
          <div className="flex justify-end space-x-4 mt-4">
            <button
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              onClick={async () => {
                await handleAddMember();
                setSelectedUserId(''); // Reset the selection
              }}
              disabled={!selectedUserId}
            >
              Add
            </button>
            <button
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
      
      )}
    </div>
  );
}
