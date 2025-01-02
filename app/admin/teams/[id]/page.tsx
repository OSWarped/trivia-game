'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';

// interface Team {
//   id: string;
//   name: string;
//   captain: {
//     id: string;
//     name: string;
//   } | null;
//   players: {  // Assuming team members are called players
//     id: string;
//     name: string;
//   }[];
// }

interface User {
  id: string;
  name: string;
}

export default function EditTeam() {
  const router = useRouter();
  const { id } = useParams();
  //const [team, setTeam] = useState<Team | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [newTeamName, setNewTeamName] = useState('');
  const [selectedCaptainId, setSelectedCaptainId] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Fetch team data and users
  useEffect(() => {
    async function fetchTeam() {
      try {
        const res = await fetch(`/api/admin/teams/${id}`);
        const data = await res.json();
  
        if (data) {
         // setTeam(data);
          setNewTeamName(data.name);
          setSelectedCaptainId(data.captain ? data.captain.id : null);
          setSelectedMembers(data.players ? data.players.map((member: User) => member.id) : []);
        }
      } catch (err) {
        console.error('Error fetching team:', err);
        setError('Failed to fetch team data');
      } finally {
        setLoading(false);  // Ensure loading is set to false here
      }
    }
  
    async function fetchUsers() {
      try {
        const res = await fetch('/api/admin/users');
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to fetch users');
      }
    }
  
    fetchTeam();
    fetchUsers();
  }, [id]);  // Ensure this depends on the 'id' from params
  

  const handleSaveChanges = async () => {
    if (!newTeamName || !selectedCaptainId) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const res = await fetch(`/api/admin/teams/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTeamName,
          captainId: selectedCaptainId,
          memberIds: selectedMembers,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update team');
      }

      //const updatedTeam = await res.json();
      //setTeam(updatedTeam); // Update the team state with the new data
      router.push(`/admin/teams/${id}`); // Redirect back to the team details page
    } catch (err) {
      console.error('Error saving changes:', err);
      alert('Failed to save changes');
    }
  };

  const handleCancel = () => {
    router.push(`/admin/teams/${id}`); // Redirect back to the team details page without saving
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Edit Team Details</h1>

      <div className="bg-white p-6 rounded shadow-md">
        <h2 className="text-xl font-semibold mb-4">Team Information</h2>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block font-medium mb-1">Team Name</label>
            <input
              type="text"
              className="border border-gray-300 p-2 rounded w-full"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Select Captain</label>
            <select
              className="border border-gray-300 p-2 rounded w-full"
              value={selectedCaptainId || ''}
              onChange={(e) => setSelectedCaptainId(e.target.value)}
            >
              <option value="">Select a captain</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium mb-1">Select Team Members</label>
            <select
              multiple
              className="border border-gray-300 p-2 rounded w-full"
              value={selectedMembers}
              onChange={(e) => setSelectedMembers(Array.from(e.target.selectedOptions, (option) => option.value))}
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            onClick={handleSaveChanges}
          >
            Save Changes
          </button>
          <button
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            onClick={handleCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
