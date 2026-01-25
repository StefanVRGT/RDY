'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TenantFormDialog } from './tenant-form-dialog';
import { TenantStatsDialog } from './tenant-stats-dialog';

type StatusFilter = 'all' | 'active' | 'disabled';
type SortBy = 'name' | 'createdAt' | 'status';
type SortOrder = 'asc' | 'desc';

export function TenantManagement() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<string | null>(null);
  const [viewingStats, setViewingStats] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.tenants.list.useQuery({
    search: search || undefined,
    status: statusFilter,
    sortBy,
    sortOrder,
    page,
    limit: 20,
  });

  const enableMutation = trpc.tenants.enable.useMutation({
    onSuccess: () => utils.tenants.list.invalidate(),
  });

  const disableMutation = trpc.tenants.disable.useMutation({
    onSuccess: () => utils.tenants.list.invalidate(),
  });

  const deleteMutation = trpc.tenants.delete.useMutation({
    onSuccess: () => utils.tenants.list.invalidate(),
  });

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    if (currentStatus === 'active') {
      await disableMutation.mutateAsync({ id });
    } else {
      await enableMutation.mutateAsync({ id });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) {
      await deleteMutation.mutateAsync({ id });
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (error) {
    return (
      <div className="rounded-lg bg-red-900/20 p-4 text-red-400">
        Error loading tenants: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by name or slug..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-sm border-gray-700 bg-gray-900 text-white placeholder:text-gray-500"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value: StatusFilter) => {
            setStatusFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px] border-gray-700 bg-gray-900 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="border-gray-700 bg-gray-900">
            <SelectItem value="all" className="text-white">
              All Status
            </SelectItem>
            <SelectItem value="active" className="text-white">
              Active
            </SelectItem>
            <SelectItem value="disabled" className="text-white">
              Disabled
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
          <SelectTrigger className="w-[140px] border-gray-700 bg-gray-900 text-white">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent className="border-gray-700 bg-gray-900">
            <SelectItem value="createdAt" className="text-white">
              Created
            </SelectItem>
            <SelectItem value="name" className="text-white">
              Name
            </SelectItem>
            <SelectItem value="status" className="text-white">
              Status
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortOrder} onValueChange={(value: SortOrder) => setSortOrder(value)}>
          <SelectTrigger className="w-[100px] border-gray-700 bg-gray-900 text-white">
            <SelectValue placeholder="Order" />
          </SelectTrigger>
          <SelectContent className="border-gray-700 bg-gray-900">
            <SelectItem value="desc" className="text-white">
              Desc
            </SelectItem>
            <SelectItem value="asc" className="text-white">
              Asc
            </SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setCreateDialogOpen(true)}>Create Tenant</Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-800 bg-gray-900">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-400">Name</TableHead>
              <TableHead className="text-gray-400">Slug</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">Created</TableHead>
              <TableHead className="text-right text-gray-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-gray-400">
                  Loading...
                </TableCell>
              </TableRow>
            ) : !data?.tenants?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-gray-400">
                  No tenants found
                </TableCell>
              </TableRow>
            ) : (
              data.tenants.map((tenant) => (
                <TableRow key={tenant.id} className="border-gray-800">
                  <TableCell className="font-medium text-white">{tenant.name}</TableCell>
                  <TableCell className="font-mono text-sm text-gray-400">{tenant.slug}</TableCell>
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
                  <TableCell className="text-gray-400">{formatDate(tenant.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingStats(tenant.id)}
                        className="text-gray-400 hover:text-white"
                      >
                        Stats
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingTenant(tenant.id)}
                        className="text-gray-400 hover:text-white"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(tenant.id, tenant.status)}
                        disabled={enableMutation.isPending || disableMutation.isPending}
                        className={
                          tenant.status === 'active'
                            ? 'text-red-400 hover:text-red-300'
                            : 'text-green-400 hover:text-green-300'
                        }
                      >
                        {tenant.status === 'active' ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(tenant.id)}
                        disabled={deleteMutation.isPending}
                        className="text-red-400 hover:text-red-300"
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.pagination.total)} of{' '}
            {data.pagination.total} tenants
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
              disabled={page === data.pagination.totalPages}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <TenantFormDialog
        open={createDialogOpen || !!editingTenant}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditingTenant(null);
          }
        }}
        tenantId={editingTenant}
      />

      {/* Stats Dialog */}
      <TenantStatsDialog
        open={!!viewingStats}
        onOpenChange={(open) => {
          if (!open) setViewingStats(null);
        }}
        tenantId={viewingStats}
      />
    </div>
  );
}
