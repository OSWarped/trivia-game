"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { TeamMembership } from "@prisma/client";

interface User {
  id: string;
  name: string;
}

export default function EditTeam() {
  const router = useRouter();
  const { id } = useParams();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[] | null>(null); // State to handle warnings

  const [newTeamName, setNewTeamName] = useState("");
  const [selectedCaptainId, setSelectedCaptainId] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Fetch team data and users
  useEffect(() => {
    async function fetchTeam() {
      try {
        const res = await fetch(`/api/admin/teams/${id}`);
        const data = await res.json();

        if (data) {
          setNewTeamName(data.name);
          setSelectedCaptainId(data.captain?.id || null);
          setSelectedMembers(data.memberships?.map((membership: TeamMembership) => membership.userId) || []);
        }
      } catch (err) {
        console.error("Error fetching team:", err);
        setError("Failed to fetch team data");
      } finally {
        setLoading(false);
      }
    }

    async function fetchUsers() {
      try {
        const res = await fetch("/api/admin/users");
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Failed to fetch users");
      }
    }

    fetchTeam();
    fetchUsers();
  }, [id]);

  const handleSaveChanges = async () => {
    if (!newTeamName || !selectedCaptainId) {
      alert("Please fill in all fields");
      return;
    }

    try {
      const res = await fetch(`/api/admin/teams/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newTeamName,
          captainId: selectedCaptainId,
          memberIds: selectedMembers,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to update team");
      }

      // Update warnings if present
      if (result.warnings) {
        setWarnings(result.warnings);
      } else {
        setWarnings(null);
      }

      router.push(`/admin/teams`); // Redirect to the team details page
    } catch (err) {
      console.error("Error saving changes:", err);
      alert("Failed to save changes");
    }
  };

  const handleCancel = () => {
    router.push(`/admin/teams/${id}`);
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

        {/* Warnings Section */}
{warnings && warnings.length > 0 && (
  <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 rounded">
    <h3 className="font-semibold">Warnings:</h3>
    <ul className="list-disc pl-5">
      {warnings.map((warning, index) => (
        <li key={index}>{warning}</li>
      ))}
    </ul>
  </div>
)}

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
              value={selectedCaptainId || ""}
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
              onChange={(e) =>
                setSelectedMembers(Array.from(e.target.selectedOptions, (option) => option.value))
              }
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
