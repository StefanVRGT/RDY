'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
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
        return 'bg-blue-900/30 text-blue-400';
      case 'audio':
        return 'bg-purple-900/30 text-purple-400';
      case 'text':
        return 'bg-green-900/30 text-green-400';
      default:
        return 'bg-gray-900/30 text-gray-400';
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
      <div className="rounded-lg bg-red-900/20 p-4 text-red-400">
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
            <SelectTrigger className="w-[140px] border-gray-700 bg-gray-900 text-white">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="border-gray-700 bg-gray-900">
              <SelectItem value="all" className="text-white">
                All Types
              </SelectItem>
              <SelectItem value="video" className="text-white">
                Video
              </SelectItem>
              <SelectItem value="audio" className="text-white">
                Audio
              </SelectItem>
              <SelectItem value="text" className="text-white">
                Text
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
              <SelectItem value="titleDe" className="text-white">
                Title
              </SelectItem>
              <SelectItem value="type" className="text-white">
                Type
              </SelectItem>
              <SelectItem value="durationMinutes" className="text-white">
                Duration
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={(value: SortOrder) => setSortOrder(value)}>
            <SelectTrigger className="w-[100px] border-gray-700 bg-gray-900 text-white">
              <SelectValue placeholder="Order" />
            </SelectTrigger>
            <SelectContent className="border-gray-700 bg-gray-900">
              <SelectItem value="asc" className="text-white">
                Asc
              </SelectItem>
              <SelectItem value="desc" className="text-white">
                Desc
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>Add Exercise</Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-800 bg-gray-900">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-400">Type</TableHead>
              <TableHead className="text-gray-400">Title (DE)</TableHead>
              <TableHead className="text-gray-400">Title (EN)</TableHead>
              <TableHead className="text-gray-400">Duration</TableHead>
              <TableHead className="text-gray-400">Media</TableHead>
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
            ) : !data?.exercises?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-gray-400">
                  No exercises found
                </TableCell>
              </TableRow>
            ) : (
              data.exercises.map((exercise) => (
                <TableRow key={exercise.id} className="border-gray-800">
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getTypeBadgeClass(exercise.type)}`}
                    >
                      {getTypeLabel(exercise.type)}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-white">
                    {exercise.titleDe}
                  </TableCell>
                  <TableCell className="text-gray-400">
                    {exercise.titleEn || '-'}
                  </TableCell>
                  <TableCell className="text-gray-400">
                    {formatDuration(exercise.durationMinutes)}
                  </TableCell>
                  <TableCell className="text-gray-400">
                    {exercise.type === 'video' && exercise.videoUrl ? (
                      <span className="text-blue-400">Video</span>
                    ) : exercise.type === 'audio' && exercise.audioUrl ? (
                      <span className="text-purple-400">Audio</span>
                    ) : exercise.type === 'text' && exercise.contentDe ? (
                      <span className="text-green-400">Text</span>
                    ) : (
                      <span className="text-gray-500">None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingExercise(exercise)}
                        className="text-gray-400 hover:text-white"
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
          <p className="text-sm text-gray-400">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.pagination.total)} of{' '}
            {data.pagination.total} exercises
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
