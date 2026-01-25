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
import { RoleChangeDialog } from './role-change-dialog';
import { MentorAssignDialog } from './mentor-assign-dialog';

type RoleFilter = 'all' | 'mentor' | 'mentee';
type SortBy = 'name' | 'email' | 'role' | 'createdAt';
type SortOrder = 'asc' | 'desc';

export function UserManagement() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);
  const [changingRoleUser, setChangingRoleUser] = useState<{
    id: string;
    name: string | null;
    email: string;
    role: 'mentor' | 'mentee';
  } | null>(null);
  const [assigningMentorUser, setAssigningMentorUser] = useState<{
    id: string;
    name: string | null;
    email: string;
    mentorId: string | null;
  } | null>(null);

  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.users.list.useQuery({
    search: search || undefined,
    role: roleFilter,
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

  if (error) {
    return (
      <div className="rounded-lg bg-red-900/20 p-4 text-red-400">
        Error loading users: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-sm border-gray-700 bg-gray-900 text-white placeholder:text-gray-500"
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(value: RoleFilter) => {
            setRoleFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px] border-gray-700 bg-gray-900 text-white">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent className="border-gray-700 bg-gray-900">
            <SelectItem value="all" className="text-white">
              All Roles
            </SelectItem>
            <SelectItem value="mentor" className="text-white">
              Mentors
            </SelectItem>
            <SelectItem value="mentee" className="text-white">
              Mentees
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
            <SelectItem value="email" className="text-white">
              Email
            </SelectItem>
            <SelectItem value="role" className="text-white">
              Role
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
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-800 bg-gray-900">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-400">Name</TableHead>
              <TableHead className="text-gray-400">Email</TableHead>
              <TableHead className="text-gray-400">Role</TableHead>
              <TableHead className="text-gray-400">Mentor</TableHead>
              <TableHead className="text-gray-400">Created</TableHead>
              <TableHead className="text-right text-gray-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-gray-400">
                  Loading...
                </TableCell>
              </TableRow>
            ) : !data?.users?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-gray-400">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              data.users.map((user) => (
                <TableRow key={user.id} className="border-gray-800">
                  <TableCell className="font-medium text-white">{user.name || '-'}</TableCell>
                  <TableCell className="text-gray-400">{user.email}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        user.role === 'mentor'
                          ? 'bg-blue-900/30 text-blue-400'
                          : 'bg-purple-900/30 text-purple-400'
                      }`}
                    >
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-400">
                    {user.role === 'mentee' ? (
                      user.mentor ? (
                        <span className="text-gray-300">
                          {user.mentor.name || user.mentor.email}
                        </span>
                      ) : (
                        <span className="italic text-gray-500">Not assigned</span>
                      )
                    ) : (
                      <span className="text-gray-600">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-400">{formatDate(user.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setChangingRoleUser({
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            role: user.role as 'mentor' | 'mentee',
                          })
                        }
                        className="text-gray-400 hover:text-white"
                      >
                        Change Role
                      </Button>
                      {user.role === 'mentee' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setAssigningMentorUser({
                              id: user.id,
                              name: user.name,
                              email: user.email,
                              mentorId: user.mentorId,
                            })
                          }
                          className="text-gray-400 hover:text-white"
                        >
                          Assign Mentor
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
          <p className="text-sm text-gray-400">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.pagination.total)} of{' '}
            {data.pagination.total} users
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

      {/* Role Change Dialog */}
      <RoleChangeDialog
        open={!!changingRoleUser}
        onOpenChange={(open) => {
          if (!open) setChangingRoleUser(null);
        }}
        user={changingRoleUser}
        onSuccess={() => {
          utils.users.list.invalidate();
          setChangingRoleUser(null);
        }}
      />

      {/* Mentor Assignment Dialog */}
      <MentorAssignDialog
        open={!!assigningMentorUser}
        onOpenChange={(open) => {
          if (!open) setAssigningMentorUser(null);
        }}
        user={assigningMentorUser}
        onSuccess={() => {
          utils.users.list.invalidate();
          setAssigningMentorUser(null);
        }}
      />
    </div>
  );
}
