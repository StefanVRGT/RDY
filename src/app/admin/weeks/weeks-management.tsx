'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreateWeekDialog } from './create-week-dialog';
import { EditWeekDialog } from './edit-week-dialog';
import { DeleteWeekDialog } from './delete-week-dialog';

interface Week {
  id: string;
  schwerpunktebeneId: string;
  weekNumber: string;
  orderIndex: string;
  titleDe: string;
  titleEn: string | null;
  descriptionDe: string | null;
  descriptionEn: string | null;
  herkunftDe: string | null;
  herkunftEn: string | null;
  zielDe: string | null;
  zielEn: string | null;
  measurementType: 'scale_1_10' | 'yes_no' | 'frequency' | 'percentage' | 'custom' | null;
  measurementQuestionDe: string | null;
  measurementQuestionEn: string | null;
}

interface WeeksManagementProps {
  schwerpunktebeneId: string;
}

export function WeeksManagement({ schwerpunktebeneId }: WeeksManagementProps) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingWeek, setEditingWeek] = useState<Week | null>(null);
  const [deletingWeek, setDeletingWeek] = useState<{ id: string; title: string } | null>(null);
  const [draggedWeekId, setDraggedWeekId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.weeks.list.useQuery({
    schwerpunktebeneId,
    page,
    limit: 20,
  });

  const reorderMutation = trpc.weeks.reorder.useMutation({
    onSuccess: () => {
      utils.weeks.list.invalidate({ schwerpunktebeneId });
    },
  });

  const getMeasurementTypeLabel = (type: string | null) => {
    switch (type) {
      case 'scale_1_10':
        return 'Scale 1-10';
      case 'yes_no':
        return 'Yes/No';
      case 'frequency':
        return 'Frequency';
      case 'percentage':
        return 'Percentage';
      case 'custom':
        return 'Custom';
      default:
        return '-';
    }
  };

  const truncateText = (text: string | null, maxLength: number = 50) => {
    if (!text) return '-';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  const handleDragStart = (weekId: string) => {
    setDraggedWeekId(weekId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetWeekId: string) => {
    if (!draggedWeekId || draggedWeekId === targetWeekId || !data?.weeks) return;

    const weekIds = data.weeks.map((w) => w.id);
    const draggedIndex = weekIds.indexOf(draggedWeekId);
    const targetIndex = weekIds.indexOf(targetWeekId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder the array
    const newOrder = [...weekIds];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedWeekId);

    setDraggedWeekId(null);

    await reorderMutation.mutateAsync({
      schwerpunktebeneId,
      weekIds: newOrder,
    });
  };

  const handleDragEnd = () => {
    setDraggedWeekId(null);
  };

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-500">
        Error loading weeks: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with focus area info and buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/schwerpunktebenen')}
            className="text-rdy-gray-400 hover:text-rdy-black"
          >
            &larr; Back to Focus Areas
          </Button>
          {data?.schwerpunktebene && (
            <div className="rounded-lg border border-rdy-gray-200 bg-rdy-gray-100 px-4 py-2">
              <span className="text-sm text-rdy-gray-400">Focus Area: </span>
              <span className="font-medium text-rdy-black">{data.schwerpunktebene.titleDe}</span>
              <span className="ml-2 text-sm text-rdy-gray-500">
                (Month {data.schwerpunktebene.monthNumber})
              </span>
            </div>
          )}
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>Add Week</Button>
      </div>

      {/* Reorder hint */}
      <div className="text-sm text-rdy-gray-500">
        Drag and drop rows to reorder weeks within the focus area.
      </div>

      {/* Table */}
      <div className="rounded-lg border border-rdy-gray-200 bg-rdy-gray-100">
        <Table>
          <TableHeader>
            <TableRow className="border-rdy-gray-200 hover:bg-transparent">
              <TableHead className="w-[50px] text-rdy-gray-400">#</TableHead>
              <TableHead className="text-rdy-gray-400">Week</TableHead>
              <TableHead className="text-rdy-gray-400">Title (DE)</TableHead>
              <TableHead className="text-rdy-gray-400">Title (EN)</TableHead>
              <TableHead className="text-rdy-gray-400">Goal (DE)</TableHead>
              <TableHead className="text-rdy-gray-400">Measurement</TableHead>
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
            ) : !data?.weeks?.length ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-rdy-gray-400">
                  No weeks found. Add your first week to get started.
                </TableCell>
              </TableRow>
            ) : (
              data.weeks.map((week, index) => (
                <TableRow
                  key={week.id}
                  className={`border-rdy-gray-200 cursor-move ${
                    draggedWeekId === week.id ? 'opacity-50' : ''
                  }`}
                  draggable
                  onDragStart={() => handleDragStart(week.id)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(week.id)}
                  onDragEnd={handleDragEnd}
                >
                  <TableCell className="text-rdy-gray-500">{index + 1}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-rdy-orange-500/10 px-2 py-1 text-xs font-medium text-rdy-orange-500">
                      Week {week.weekNumber}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-rdy-black">{week.titleDe}</TableCell>
                  <TableCell className="text-rdy-gray-400">{week.titleEn || '-'}</TableCell>
                  <TableCell className="text-rdy-gray-400">{truncateText(week.zielDe)}</TableCell>
                  <TableCell className="text-rdy-gray-400">
                    {getMeasurementTypeLabel(week.measurementType)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingWeek(week)}
                        className="text-rdy-gray-400 hover:text-rdy-black"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDeletingWeek({
                            id: week.id,
                            title: week.titleDe,
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
            {data.pagination.total} weeks
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
      <CreateWeekDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        schwerpunktebeneId={schwerpunktebeneId}
        onSuccess={() => {
          utils.weeks.list.invalidate({ schwerpunktebeneId });
          setShowCreateDialog(false);
        }}
      />

      {/* Edit Dialog */}
      <EditWeekDialog
        open={!!editingWeek}
        onOpenChange={(open) => {
          if (!open) setEditingWeek(null);
        }}
        week={editingWeek}
        onSuccess={() => {
          utils.weeks.list.invalidate({ schwerpunktebeneId });
          setEditingWeek(null);
        }}
      />

      {/* Delete Dialog */}
      <DeleteWeekDialog
        open={!!deletingWeek}
        onOpenChange={(open) => {
          if (!open) setDeletingWeek(null);
        }}
        week={deletingWeek}
        onSuccess={() => {
          utils.weeks.list.invalidate({ schwerpunktebeneId });
          setDeletingWeek(null);
        }}
      />
    </div>
  );
}
