'use client';

import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TenantStatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string | null;
}

export function TenantStatsDialog({ open, onOpenChange, tenantId }: TenantStatsDialogProps) {
  const {
    data: stats,
    isLoading,
    error,
  } = trpc.tenants.getStats.useQuery({ id: tenantId! }, { enabled: !!tenantId && open });

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Tenant Usage Statistics</DialogTitle>
          <DialogDescription className="text-rdy-gray-400">
            {stats ? `Statistics for ${stats.tenantName}` : 'Loading...'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-rdy-gray-400">Loading statistics...</div>
        ) : error ? (
          <div className="rounded-lg bg-red-50 p-4 text-red-500">
            Error loading statistics: {error.message}
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Status Banner */}
            <div
              className={`rounded-lg p-4 ${
                stats.tenantStatus === 'active'
                  ? 'bg-green-50 text-green-600'
                  : 'bg-red-50 text-red-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <span className="font-semibold capitalize">{stats.tenantStatus}</span>
              </div>
            </div>

            {/* User Statistics */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border-rdy-gray-200 bg-rdy-gray-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-rdy-gray-400">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-rdy-black">{stats.users.total}</p>
                </CardContent>
              </Card>

              <Card className="border-rdy-gray-200 bg-rdy-gray-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-rdy-gray-400">
                    New Users (30 days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-rdy-black">{stats.users.recentRegistrations}</p>
                </CardContent>
              </Card>
            </div>

            {/* User Breakdown by Role */}
            <Card className="border-rdy-gray-200 bg-rdy-gray-100">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-rdy-gray-400">Users by Role</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-rdy-gray-600">Admins</span>
                    <span className="font-mono text-rdy-black">{stats.users.byRole.admin}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-rdy-gray-600">Mentors</span>
                    <span className="font-mono text-rdy-black">{stats.users.byRole.mentor}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-rdy-gray-600">Mentees</span>
                    <span className="font-mono text-rdy-black">{stats.users.byRole.mentee}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tenant Info */}
            <div className="text-sm text-rdy-gray-400">
              <p>Created: {formatDate(stats.createdAt)}</p>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-rdy-gray-200 text-rdy-gray-600 hover:bg-rdy-gray-200"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
