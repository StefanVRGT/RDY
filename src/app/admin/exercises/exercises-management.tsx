'use client';

import { useState } from 'react';
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
import { CreateExerciseDialog } from './create-exercise-dialog';
import { EditExerciseDialog } from './edit-exercise-dialog';
import { DeleteExerciseDialog } from './delete-exercise-dialog';

type TypeFilter = 'all' | 'video' | 'audio' | 'text';
type SortBy = 'titleDe' | 'type' | 'durationMinutes' | 'createdAt';
type SortOrder = 'asc' | 'desc';

interface Exercise {
  id: string;
  type: 'video' | 'audio' | 'text';
  titleDe: string;
  titleEn: string | null;
  descriptionDe: string | null;
  descriptionEn: string | null;
  durationMinutes: number | null;
  videoUrl: string | null;
  audioUrl: string | null;
  contentDe: string | null;
  contentEn: string | null;
}

export function ExercisesManagement() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [deletingExercise, setDeletingExercise] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.exercises.list.useQuery({
    type: typeFilter,
    sortBy,
    sortOrder,
    page,
    limit: 20,
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'video':
        return 'Video';
      case 'audio':
        return 'Audio';
      case 'text':
        return 'Text';
      default:
        return type;
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'video':
        return 'bg-rdy-orange-500/10 text-rdy-orange-500';
      case 'audio':
        return 'bg-rdy-orange-500/10 text-rdy-orange-500';
      case 'text':
        return 'bg-rdy-orange-500/10 text-green-400';
      default:
        return 'bg-rdy-gray-100/30 text-rdy-gray-400';
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '-';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-500">
        Error loading exercises: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create button */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <Select
            value={typeFilter}
            onValueChange={(value: TypeFilter) => {
              setTypeFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px] border-rdy-gray-200 bg-rdy-gray-100 text-rdy-black">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="border-rdy-gray-200 bg-rdy-gray-100">
              <SelectItem value="all" className="text-rdy-black">
                All Types
              </SelectItem>
              <SelectItem value="video" className="text-rdy-black">
                Video
              </SelectItem>
              <SelectItem value="audio" className="text-rdy-black">
                Audio
              </SelectItem>
              <SelectItem value="text" className="text-rdy-black">
                Text
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
              <SelectItem value="titleDe" className="text-rdy-black">
                Title
              </SelectItem>
              <SelectItem value="type" className="text-rdy-black">
                Type
              </SelectItem>
              <SelectItem value="durationMinutes" className="text-rdy-black">
                Duration
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
        <Button onClick={() => setShowCreateDialog(true)}>Add Exercise</Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-rdy-gray-200 bg-rdy-gray-100">
        <Table>
          <TableHeader>
            <TableRow className="border-rdy-gray-200 hover:bg-transparent">
              <TableHead className="text-rdy-gray-400">Type</TableHead>
              <TableHead className="text-rdy-gray-400">Title (DE)</TableHead>
              <TableHead className="text-rdy-gray-400">Title (EN)</TableHead>
              <TableHead className="text-rdy-gray-400">Duration</TableHead>
              <TableHead className="text-rdy-gray-400">Media</TableHead>
              <TableHead className="text-right text-rdy-gray-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-rdy-gray-400">
                  Loading...
                </TableCell>
              </TableRow>
            ) : !data?.exercises?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-rdy-gray-400">
                  No exercises found
                </TableCell>
              </TableRow>
            ) : (
              data.exercises.map((exercise) => (
                <TableRow key={exercise.id} className="border-rdy-gray-200">
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getTypeBadgeClass(exercise.type)}`}
                    >
                      {getTypeLabel(exercise.type)}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-rdy-black">
                    {exercise.titleDe}
                  </TableCell>
                  <TableCell className="text-rdy-gray-400">
                    {exercise.titleEn || '-'}
                  </TableCell>
                  <TableCell className="text-rdy-gray-400">
                    {formatDuration(exercise.durationMinutes)}
                  </TableCell>
                  <TableCell className="text-rdy-gray-400">
                    {exercise.type === 'video' && exercise.videoUrl ? (
                      <span className="text-rdy-orange-500">Video</span>
                    ) : exercise.type === 'audio' && exercise.audioUrl ? (
                      <span className="text-rdy-orange-500">Audio</span>
                    ) : exercise.type === 'text' && exercise.contentDe ? (
                      <span className="text-green-400">Text</span>
                    ) : (
                      <span className="text-rdy-gray-500">None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingExercise(exercise)}
                        className="text-rdy-gray-400 hover:text-rdy-black"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDeletingExercise({
                            id: exercise.id,
                            title: exercise.titleDe,
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
            {data.pagination.total} exercises
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
      <CreateExerciseDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          utils.exercises.list.invalidate();
          setShowCreateDialog(false);
        }}
      />

      {/* Edit Dialog */}
      <EditExerciseDialog
        open={!!editingExercise}
        onOpenChange={(open) => {
          if (!open) setEditingExercise(null);
        }}
        exercise={editingExercise}
        onSuccess={() => {
          utils.exercises.list.invalidate();
          setEditingExercise(null);
        }}
      />

      {/* Delete Dialog */}
      <DeleteExerciseDialog
        open={!!deletingExercise}
        onOpenChange={(open) => {
          if (!open) setDeletingExercise(null);
        }}
        exercise={deletingExercise}
        onSuccess={() => {
          utils.exercises.list.invalidate();
          setDeletingExercise(null);
        }}
      />
    </div>
  );
}
