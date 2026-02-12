'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
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
import { CreateInvitationDialog } from './create-invitation-dialog';
import { InvitationActionsDialog } from './invitation-actions-dialog';

type StatusFilter = 'all' | 'pending' | 'accepted' | 'expired' | 'revoked';
type SortBy = 'email' | 'role' | 'status' | 'createdAt' | 'expiresAt';
type SortOrder = 'asc' | 'desc';

export function InvitationManagement() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<{
    id: string;
    email: string;
    status: 'pending' | 'accepted' | 'expired' | 'revoked';
  } | null>(null);

  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.invitations.list.useQuery({
    search: search || undefined,
    status: statusFilter,
    sortBy,
    sortOrder,
    page,
    limit: 20,
  });

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadgeClass = (status: string, isExpired: boolean) => {
    if (isExpired && status === 'pending') {
      return 'bg-rdy-orange-500/10 text-rdy-orange-500';
    }
    switch (status) {
      case 'pending':
        return 'bg-yellow-900/30 text-yellow-400';
      case 'accepted':
        return 'bg-rdy-orange-500/10 text-green-400';
      case 'expired':
        return 'bg-rdy-orange-500/10 text-rdy-orange-500';
      case 'revoked':
        return 'bg-red-900/30 text-red-400';
      default:
        return 'bg-rdy-gray-100/30 text-rdy-gray-400';
    }
  };

  const getDisplayStatus = (status: string, isExpired: boolean) => {
    if (isExpired && status === 'pending') {
      return 'expired';
    }
    return status;
  };

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-500">
        Error loading invitations: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create button */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="max-w-sm border-rdy-gray-200 bg-rdy-gray-100 text-rdy-black placeholder:text-rdy-gray-500"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value: StatusFilter) => {
              setStatusFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px] border-rdy-gray-200 bg-rdy-gray-100 text-rdy-black">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="border-rdy-gray-200 bg-rdy-gray-100">
              <SelectItem value="all" className="text-rdy-black">
                All Status
              </SelectItem>
              <SelectItem value="pending" className="text-rdy-black">
                Pending
              </SelectItem>
              <SelectItem value="accepted" className="text-rdy-black">
                Accepted
              </SelectItem>
              <SelectItem value="expired" className="text-rdy-black">
                Expired
              </SelectItem>
              <SelectItem value="revoked" className="text-rdy-black">
                Revoked
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
            <SelectTrigger className="w-[140px] border-rdy-gray-200 bg-rdy-gray-100 text-rdy-black">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="border-rdy-gray-200 bg-rdy-gray-100">
              <SelectItem value="createdAt" className="text-rdy-black">
                Created
              </SelectItem>
              <SelectItem value="expiresAt" className="text-rdy-black">
                Expires
              </SelectItem>
              <SelectItem value="email" className="text-rdy-black">
                Email
              </SelectItem>
              <SelectItem value="role" className="text-rdy-black">
                Role
              </SelectItem>
              <SelectItem value="status" className="text-rdy-black">
                Status
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={(value: SortOrder) => setSortOrder(value)}>
            <SelectTrigger className="w-[100px] border-rdy-gray-200 bg-rdy-gray-100 text-rdy-black">
              <SelectValue placeholder="Order" />
            </SelectTrigger>
            <SelectContent className="border-rdy-gray-200 bg-rdy-gray-100">
              <SelectItem value="desc" className="text-rdy-black">
                Desc
              </SelectItem>
              <SelectItem value="asc" className="text-rdy-black">
                Asc
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>Invite User</Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-rdy-gray-200 bg-rdy-gray-100">
        <Table>
          <TableHeader>
            <TableRow className="border-rdy-gray-200 hover:bg-transparent">
              <TableHead className="text-rdy-gray-400">Email</TableHead>
              <TableHead className="text-rdy-gray-400">Role</TableHead>
              <TableHead className="text-rdy-gray-400">Status</TableHead>
              <TableHead className="text-rdy-gray-400">Invited By</TableHead>
              <TableHead className="text-rdy-gray-400">Expires</TableHead>
              <TableHead className="text-rdy-gray-400">Created</TableHead>
              <TableHead className="text-right text-rdy-gray-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-rdy-gray-400">
                  Loading...
                </TableCell>
              </TableRow>
            ) : !data?.invitations?.length ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-rdy-gray-400">
                  No invitations found
                </TableCell>
              </TableRow>
            ) : (
              data.invitations.map((invitation) => (
                <TableRow key={invitation.id} className="border-rdy-gray-200">
                  <TableCell className="font-medium text-rdy-black">{invitation.email}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        invitation.role === 'mentor'
                          ? 'bg-rdy-orange-500/10 text-rdy-orange-500'
                          : 'bg-rdy-orange-500/10 text-rdy-orange-500'
                      }`}
                    >
                      {invitation.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeClass(invitation.status, invitation.isExpired)}`}
                    >
                      {getDisplayStatus(invitation.status, invitation.isExpired)}
                    </span>
                  </TableCell>
                  <TableCell className="text-rdy-gray-400">
                    {invitation.inviter?.name || invitation.inviter?.email || '-'}
                  </TableCell>
                  <TableCell className="text-rdy-gray-400">
                    {formatDate(invitation.expiresAt)}
                  </TableCell>
                  <TableCell className="text-rdy-gray-400">
                    {formatDate(invitation.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {(invitation.status === 'pending' || invitation.isExpired) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setSelectedInvitation({
                              id: invitation.id,
                              email: invitation.email,
                              status: invitation.isExpired ? 'expired' : invitation.status,
                            })
                          }
                          className="text-rdy-gray-400 hover:text-rdy-black"
                        >
                          Actions
                        </Button>
                      )}
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
          <p className="text-sm text-rdy-gray-400">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.pagination.total)} of{' '}
            {data.pagination.total} invitations
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="border-rdy-gray-200 text-rdy-gray-600 hover:bg-rdy-gray-200"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
              disabled={page === data.pagination.totalPages}
              className="border-rdy-gray-200 text-rdy-gray-600 hover:bg-rdy-gray-200"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create Invitation Dialog */}
      <CreateInvitationDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          utils.invitations.list.invalidate();
          setShowCreateDialog(false);
        }}
      />

      {/* Invitation Actions Dialog */}
      <InvitationActionsDialog
        open={!!selectedInvitation}
        onOpenChange={(open) => {
          if (!open) setSelectedInvitation(null);
        }}
        invitation={selectedInvitation}
        onSuccess={() => {
          utils.invitations.list.invalidate();
          setSelectedInvitation(null);
        }}
      />
    </div>
  );
}
