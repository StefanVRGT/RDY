'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function SuperadminDashboard() {
  const { data: systemStats, isLoading: statsLoading } = trpc.dashboard.getSystemStats.useQuery();
  const { data: tenantOverview, isLoading: tenantsLoading } =
    trpc.dashboard.getTenantOverview.useQuery();
  const { data: recentActivity, isLoading: activityLoading } =
    trpc.dashboard.getRecentActivity.useQuery();

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (date: Date | string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Superadmin Dashboard</h1>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/superadmin/tenants">Manage Tenants</Link>
          </Button>
        </div>
      </div>

      {/* System-wide Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Tenants */}
        <Card className="border-gray-800 bg-gray-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-8 animate-pulse rounded bg-gray-800" />
            ) : (
              <>
                <div className="text-3xl font-bold text-white">{systemStats?.tenants.total ?? 0}</div>
                <p className="mt-1 text-xs text-gray-500">
                  <span className="text-green-400">{systemStats?.tenants.active ?? 0} active</span>
                  {' · '}
                  <span className="text-red-400">{systemStats?.tenants.disabled ?? 0} disabled</span>
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Users */}
        <Card className="border-gray-800 bg-gray-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-8 animate-pulse rounded bg-gray-800" />
            ) : (
              <>
                <div className="text-3xl font-bold text-white">{systemStats?.users.total ?? 0}</div>
                <p className="mt-1 text-xs text-gray-500">
                  +{systemStats?.users.newLast30Days ?? 0} in last 30 days
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Mentors */}
        <Card className="border-gray-800 bg-gray-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Mentors</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-8 animate-pulse rounded bg-gray-800" />
            ) : (
              <>
                <div className="text-3xl font-bold text-white">
                  {systemStats?.users.byRole.mentor ?? 0}
                </div>
                <p className="mt-1 text-xs text-gray-500">Across all tenants</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Mentees */}
        <Card className="border-gray-800 bg-gray-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Mentees</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-8 animate-pulse rounded bg-gray-800" />
            ) : (
              <>
                <div className="text-3xl font-bold text-white">
                  {systemStats?.users.byRole.mentee ?? 0}
                </div>
                <p className="mt-1 text-xs text-gray-500">Across all tenants</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader>
          <CardTitle className="text-lg text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="border-gray-700 hover:bg-gray-800">
              <Link href="/superadmin/tenants">View All Tenants</Link>
            </Button>
            <Button asChild variant="outline" className="border-gray-700 hover:bg-gray-800">
              <Link href="/superadmin/tenants?action=create">Create New Tenant</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tenant List with Status */}
        <Card className="border-gray-800 bg-gray-900">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-white">Tenants Overview</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <Link href="/superadmin/tenants">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {tenantsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded bg-gray-800" />
                ))}
              </div>
            ) : !tenantOverview?.length ? (
              <p className="py-4 text-center text-gray-400">No tenants found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800 hover:bg-transparent">
                    <TableHead className="text-gray-400">Tenant</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-right text-gray-400">Users</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenantOverview.map((tenant) => (
                    <TableRow key={tenant.id} className="border-gray-800">
                      <TableCell>
                        <div>
                          <div className="font-medium text-white">{tenant.name}</div>
                          <div className="text-xs text-gray-500">{tenant.slug}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            tenant.status === 'active'
                              ? 'bg-green-900/30 text-green-400'
                              : 'bg-red-900/30 text-red-400'
                          }`}
                        >
                          {tenant.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-gray-400">{tenant.userCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-gray-800 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-lg text-white">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded bg-gray-800" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Recent Tenants Section */}
                <div>
                  <h4 className="mb-2 text-sm font-medium text-gray-400">Recent Tenants</h4>
                  {!recentActivity?.recentTenants.length ? (
                    <p className="py-2 text-sm text-gray-500">No recent tenant activity</p>
                  ) : (
                    <div className="space-y-2">
                      {recentActivity.recentTenants.slice(0, 5).map((tenant) => (
                        <div
                          key={tenant.id}
                          className="flex items-center justify-between rounded-lg bg-gray-800/50 px-3 py-2"
                        >
                          <div>
                            <span className="text-sm text-white">{tenant.name}</span>
                            <span
                              className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                tenant.status === 'active'
                                  ? 'bg-green-900/30 text-green-400'
                                  : 'bg-red-900/30 text-red-400'
                              }`}
                            >
                              {tenant.status}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDate(tenant.updatedAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Users Section */}
                <div>
                  <h4 className="mb-2 text-sm font-medium text-gray-400">Recent Users</h4>
                  {!recentActivity?.recentUsers.length ? (
                    <p className="py-2 text-sm text-gray-500">No recent user registrations</p>
                  ) : (
                    <div className="space-y-2">
                      {recentActivity.recentUsers.slice(0, 5).map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between rounded-lg bg-gray-800/50 px-3 py-2"
                        >
                          <div>
                            <span className="text-sm text-white">
                              {user.name || user.email}
                            </span>
                            <span className="ml-2 inline-flex items-center rounded-full bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-400">
                              {user.role}
                            </span>
                            {user.tenantName && (
                              <span className="ml-2 text-xs text-gray-500">
                                @ {user.tenantName}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDateTime(user.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Breakdown by Role */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader>
          <CardTitle className="text-lg text-white">System-wide User Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="h-20 animate-pulse rounded bg-gray-800" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="rounded-lg bg-gray-800/50 p-4">
                <div className="text-2xl font-bold text-purple-400">
                  {systemStats?.users.byRole.superadmin ?? 0}
                </div>
                <div className="text-sm text-gray-400">Superadmins</div>
              </div>
              <div className="rounded-lg bg-gray-800/50 p-4">
                <div className="text-2xl font-bold text-blue-400">
                  {systemStats?.users.byRole.admin ?? 0}
                </div>
                <div className="text-sm text-gray-400">Admins</div>
              </div>
              <div className="rounded-lg bg-gray-800/50 p-4">
                <div className="text-2xl font-bold text-green-400">
                  {systemStats?.users.byRole.mentor ?? 0}
                </div>
                <div className="text-sm text-gray-400">Mentors</div>
              </div>
              <div className="rounded-lg bg-gray-800/50 p-4">
                <div className="text-2xl font-bold text-orange-400">
                  {systemStats?.users.byRole.mentee ?? 0}
                </div>
                <div className="text-sm text-gray-400">Mentees</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
