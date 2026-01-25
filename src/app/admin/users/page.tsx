import { UserManagement } from './user-management';

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">User Management</h1>
        <p className="mt-1 text-gray-400">Manage mentors and mentees within your organization</p>
      </div>
      <UserManagement />
    </div>
  );
}
