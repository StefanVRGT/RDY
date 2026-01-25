'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AddMemberDialog } from './add-member-dialog';
import { RemoveMemberDialog } from './remove-member-dialog';

interface ClassMembersTabProps {
  classId: string;
}

export function ClassMembersTab({ classId }: ClassMembersTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [removingMember, setRemovingMember] = useState<{
    userId: string;
    userName: string;
  } | null>(null);

  const utils = trpc.useUtils();

  const { data: members, isLoading, error } = trpc.classes.getMembers.useQuery({ id: classId });

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: string | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(parseFloat(amount));
  };

  if (error) {
    return (
      <div className="rounded-lg bg-red-900/20 p-4 text-red-400">
        Error loading members: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Class Members</h3>
        <Button onClick={() => setShowAddDialog(true)}>Add Member</Button>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-400">Name</TableHead>
              <TableHead className="text-gray-400">Email</TableHead>
              <TableHead className="text-gray-400">Enrolled</TableHead>
              <TableHead className="text-gray-400">Payment</TableHead>
              <TableHead className="text-gray-400">Amount</TableHead>
              <TableHead className="text-gray-400">Due Date</TableHead>
              <TableHead className="text-right text-gray-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-gray-400">
                  Loading...
                </TableCell>
              </TableRow>
            ) : !members?.length ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-gray-400">
                  No members yet. Click &quot;Add Member&quot; to enroll students.
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.id} className="border-gray-800">
                  <TableCell className="font-medium text-white">
                    {member.user.name || '-'}
                  </TableCell>
                  <TableCell className="text-gray-400">{member.user.email}</TableCell>
                  <TableCell className="text-gray-400">{formatDate(member.enrolledAt)}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        member.paid
                          ? 'bg-green-900/30 text-green-400'
                          : 'bg-yellow-900/30 text-yellow-400'
                      }`}
                    >
                      {member.paid ? 'Paid' : 'Pending'}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-400">{formatCurrency(member.amount)}</TableCell>
                  <TableCell className="text-gray-400">{formatDate(member.dueDate)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setRemovingMember({
                          userId: member.userId,
                          userName: member.user.name || member.user.email,
                        })
                      }
                      className="text-red-400 hover:text-red-300"
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Member Dialog */}
      <AddMemberDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        classId={classId}
        onSuccess={() => {
          utils.classes.getMembers.invalidate({ id: classId });
          utils.classes.getById.invalidate({ id: classId });
          utils.classes.list.invalidate();
          setShowAddDialog(false);
        }}
      />

      {/* Remove Member Dialog */}
      <RemoveMemberDialog
        open={!!removingMember}
        onOpenChange={(open) => {
          if (!open) setRemovingMember(null);
        }}
        classId={classId}
        member={removingMember}
        onSuccess={() => {
          utils.classes.getMembers.invalidate({ id: classId });
          utils.classes.getById.invalidate({ id: classId });
          utils.classes.list.invalidate();
          setRemovingMember(null);
        }}
      />
    </div>
  );
}
