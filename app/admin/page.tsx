'use client';

export default function AdminDashboard() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Welcome to the admin dashboard! Here, you can manage sites, users, and roles.</p>

      <section>
        <h2>Manage Hosting Sites</h2>
        <button>Create New Site</button>
        {/* Add a list of existing hosting sites */}
      </section>

      <section>
        <h2>Manage Users</h2>
        <button>View All Users</button>
        {/* Add user management actions */}
      </section>

      <section>
        <h2>Manage Roles</h2>
        <button>Assign Roles</button>
        {/* Add role assignment actions */}
      </section>
    </div>
  );
}
