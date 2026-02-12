import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-rdy-black">Admin Dashboard</h1>
        <p className="mt-1 text-rdy-gray-400">Manage users within your organization</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/curriculum-builder">
          <Card className="border-rdy-gray-200 bg-rdy-gray-100 transition-colors hover:bg-rdy-gray-200">
            <CardHeader>
              <CardTitle className="text-rdy-black">Curriculum Builder</CardTitle>
              <CardDescription className="text-rdy-gray-400">
                Visual builder for structuring the 3-month program curriculum
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-rdy-gray-500">
                Organize Schwerpunktebenen, Weeks, and Exercises with drag-and-drop
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/users">
          <Card className="border-rdy-gray-200 bg-rdy-gray-100 transition-colors hover:bg-rdy-gray-200">
            <CardHeader>
              <CardTitle className="text-rdy-black">User Management</CardTitle>
              <CardDescription className="text-rdy-gray-400">
                Manage mentors and mentees, assign roles, and configure mentor assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-rdy-gray-500">
                View and manage all users in your organization
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/invitations">
          <Card className="border-rdy-gray-200 bg-rdy-gray-100 transition-colors hover:bg-rdy-gray-200">
            <CardHeader>
              <CardTitle className="text-rdy-black">Invitations</CardTitle>
              <CardDescription className="text-rdy-gray-400">
                Invite new users to your organization with pre-assigned roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-rdy-gray-500">Send, resend, and manage user invitations</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/ai-settings">
          <Card className="border-rdy-gray-200 bg-rdy-gray-100 transition-colors hover:bg-rdy-gray-200">
            <CardHeader>
              <CardTitle className="text-rdy-black">AI Settings</CardTitle>
              <CardDescription className="text-rdy-gray-400">
                Configure AI providers, API keys, and model settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-rdy-gray-500">
                Set up Anthropic or Gemini integration for AI-powered features
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
