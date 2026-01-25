import { InvitationManagement } from './invitation-management';

export default function AdminInvitationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Invitation Management</h1>
        <p className="mt-1 text-gray-400">Invite new users to your organization</p>
      </div>
      <InvitationManagement />
    </div>
  );
}
