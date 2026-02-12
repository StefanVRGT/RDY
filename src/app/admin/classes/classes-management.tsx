'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
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
import { CreateClassDialog } from './create-class-dialog';
import { EditClassDialog } from './edit-class-dialog';
import { DeleteClassDialog } from './delete-class-dialog';

type StatusFilter = 'all' | 'active' | 'disabled';
type SortBy = 'name' | 'startDate' | 'endDate' | 'createdAt';
type SortOrder = 'asc' | 'desc';

interface ClassItem {
  id: string;
  name: string;
  status: 'active' | 'disabled';
  mentorId: string;
  durationMonths: number;
  startDate: Date;
  endDate: Date;
  sessionConfig: unknown;
  mentor: { id: string; name: string | null; email: string } | null;
  memberCount: number;
}

export function ClassesManagement() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [mentorFilter, setMentorFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortBy>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [deletingClass, setDeletingClass] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.classes.list.useQuery({
    status: statusFilter,
    mentorId: mentorFilter === 'all' ? undefined : mentorFilter,
    sortBy,
    sortOrder,
    page,
    limit: 20,
  });

  const { data: mentors } = trpc.classes.getMentors.useQuery();

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-rdy-orange-500/10 text-green-400';
      case 'disabled':
        return 'bg-rdy-gray-100/30 text-rdy-gray-400';
      default:
        return 'bg-rdy-gray-100/30 text-rdy-gray-400';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-500">
        Error loading classes: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create button */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-4">
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
              <SelectItem value="active" className="text-rdy-black">
                Active
              </SelectItem>
              <SelectItem value="disabled" className="text-rdy-black">
                Disabled
              </SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={mentorFilter}
            onValueChange={(value: string) => {
              setMentorFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px] border-rdy-gray-200 bg-rdy-gray-100 text-rdy-black">
              <SelectValue placeholder="Mentor" />
            </SelectTrigger>
            <SelectContent className="border-rdy-gray-200 bg-rdy-gray-100">
              <SelectItem value="all" className="text-rdy-black">
                All Mentors
              </SelectItem>
              {mentors?.map((mentor) => (
                <SelectItem key={mentor.id} value={mentor.id} className="text-rdy-black">
                  {mentor.name || mentor.email}
                </SelectItem>
              ))}
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
              <SelectItem value="name" className="text-rdy-black">
                Name
              </SelectItem>
              <SelectItem value="startDate" className="text-rdy-black">
                Start Date
              </SelectItem>
              <SelectItem value="endDate" className="text-rdy-black">
                End Date
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={(value: SortOrder) => setSortOrder(value)}>
            <SelectTrigger className="w-[100px] border-rdy-gray-200 bg-rdy-gray-100 text-rdy-black">
              <SelectValue placeholder="Order" />
            </SelectTrigger>
            <SelectContent className="border-rdy-gray-200 bg-rdy-gray-100">
              <SelectItem value="asc" className="text-rdy-black">
                Asc
              </SelectItem>
              <SelectItem value="desc" className="text-rdy-black">
                Desc
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>Add Class</Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-rdy-gray-200 bg-rdy-gray-100">
        <Table>
          <TableHeader>
            <TableRow className="border-rdy-gray-200 hover:bg-transparent">
              <TableHead className="text-rdy-gray-400">Name</TableHead>
              <TableHead className="text-rdy-gray-400">Status</TableHead>
              <TableHead className="text-rdy-gray-400">Mentor</TableHead>
              <TableHead className="text-rdy-gray-400">Members</TableHead>
              <TableHead className="text-rdy-gray-400">Duration</TableHead>
              <TableHead className="text-rdy-gray-400">Period</TableHead>
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
            ) : !data?.classes?.length ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-rdy-gray-400">
                  No classes found
                </TableCell>
              </TableRow>
            ) : (
              data.classes.map((cls) => (
                <TableRow key={cls.id} className="border-rdy-gray-200">
                  <TableCell className="font-medium text-rdy-black">{cls.name}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeClass(cls.status)}`}
                    >
                      {cls.status === 'active' ? 'Active' : 'Disabled'}
                    </span>
                  </TableCell>
                  <TableCell className="text-rdy-gray-400">
                    {cls.mentor?.name || cls.mentor?.email || '-'}
                  </TableCell>
                  <TableCell className="text-rdy-gray-400">{cls.memberCount}</TableCell>
                  <TableCell className="text-rdy-gray-400">{cls.durationMonths} months</TableCell>
                  <TableCell className="text-rdy-gray-400">
                    {formatDate(cls.startDate)} - {formatDate(cls.endDate)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/admin/classes/${cls.id}`)}
                        className="text-rdy-orange-500 hover:text-rdy-orange-500"
                      >
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingClass(cls as ClassItem)}
                        className="text-rdy-gray-400 hover:text-rdy-black"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDeletingClass({
                            id: cls.id,
                            name: cls.name,
                          })
                        }
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
          <p className="text-sm text-rdy-gray-400">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.pagination.total)} of{' '}
            {data.pagination.total} classes
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

      {/* Create Dialog */}
      <CreateClassDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          utils.classes.list.invalidate();
          setShowCreateDialog(false);
        }}
      />

      {/* Edit Dialog */}
      <EditClassDialog
        open={!!editingClass}
        onOpenChange={(open) => {
          if (!open) setEditingClass(null);
        }}
        classData={editingClass}
        onSuccess={() => {
          utils.classes.list.invalidate();
          setEditingClass(null);
        }}
      />

      {/* Delete Dialog */}
      <DeleteClassDialog
        open={!!deletingClass}
        onOpenChange={(open) => {
          if (!open) setDeletingClass(null);
        }}
        classData={deletingClass}
        onSuccess={() => {
          utils.classes.list.invalidate();
          setDeletingClass(null);
        }}
      />
    </div>
  );
}
