'use client';

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, FolderOpen, Folder } from 'lucide-react';
import { CreateExerciseDialog } from './create-exercise-dialog';
import { EditExerciseDialog } from './edit-exercise-dialog';
import { DeleteExerciseDialog } from './delete-exercise-dialog';

interface Exercise {
  id: string;
  type: 'video' | 'audio' | 'text';
  groupName: string | null;
  titleDe: string;
  titleEn: string | null;
  descriptionDe: string | null;
  descriptionEn: string | null;
  durationMinutes: number | null;
  videoUrl: string | null;
  videoUrlDe: string | null;
  videoUrlEn: string | null;
  audioUrl: string | null;
  contentDe: string | null;
  contentEn: string | null;
  imageUrl: string | null;
}

function formatDuration(minutes: number | null) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}


interface ExerciseRowProps {
  exercise: Exercise;
  onEdit: (ex: Exercise) => void;
  onDelete: (ex: { id: string; title: string }) => void;
}

function ExerciseRow({ exercise, onEdit, onDelete }: ExerciseRowProps) {
  const duration = formatDuration(exercise.durationMinutes);
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-rdy-gray-100 last:border-0 hover:bg-rdy-gray-100/40 group">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-rdy-black truncate">{exercise.titleDe}</p>
        {exercise.titleEn && (
          <p className="text-xs text-rdy-gray-400 truncate">{exercise.titleEn}</p>
        )}
      </div>
      {duration && (
        <span className="shrink-0 text-xs text-rdy-gray-400">{duration}</span>
      )}
      <div className="shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(exercise)}
          className="h-7 px-2 text-rdy-gray-400 hover:text-rdy-black"
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete({ id: exercise.id, title: exercise.titleDe })}
          className="h-7 px-2 text-red-400 hover:text-red-600"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

interface GroupSectionProps {
  name: string;
  exercises: Exercise[];
  isOpen: boolean;
  onToggle: () => void;
  onEdit: (ex: Exercise) => void;
  onDelete: (ex: { id: string; title: string }) => void;
}

function GroupSection({ name, exercises, isOpen, onToggle, onEdit, onDelete }: GroupSectionProps) {
  return (
    <div className="rounded-lg border border-rdy-gray-200 overflow-hidden bg-background">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 bg-rdy-gray-100 hover:bg-rdy-gray-200 transition-colors text-left"
      >
        {isOpen ? (
          <FolderOpen className="h-4 w-4 text-rdy-orange-500 shrink-0" />
        ) : (
          <Folder className="h-4 w-4 text-rdy-gray-400 shrink-0" />
        )}
        <span className="flex-1 font-semibold text-rdy-black">{name}</span>
        <span className="text-xs text-rdy-gray-400 mr-2">
          {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'}
        </span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-rdy-gray-400 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-rdy-gray-400 shrink-0" />
        )}
      </button>

      {isOpen && (
        <div>
          {exercises.map((ex) => (
            <ExerciseRow key={ex.id} exercise={ex} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ExercisesManagement() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [deletingExercise, setDeletingExercise] = useState<{ id: string; title: string } | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['__all__']));

  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.exercises.list.useQuery({
    type: 'all',
    sortBy: 'titleDe',
    sortOrder: 'asc',
    page: 1,
    limit: 200,
  });

  const { sortedGroupNames, grouped, ungrouped } = useMemo(() => {
    const exercises: Exercise[] = data?.exercises ?? [];
    const grouped: Record<string, Exercise[]> = {};
    const ungrouped: Exercise[] = [];

    for (const ex of exercises) {
      if (ex.groupName?.trim()) {
        const key = ex.groupName.trim();
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(ex);
      } else {
        ungrouped.push(ex);
      }
    }

    const sortedGroupNames = Object.keys(grouped).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );

    return { sortedGroupNames, grouped, ungrouped };
  }, [data?.exercises]);

  // Initialise all groups as open once data loads
  useMemo(() => {
    if (sortedGroupNames.length > 0 || ungrouped.length > 0) {
      setOpenGroups((prev) => {
        if (prev.has('__all__')) {
          const next = new Set([...sortedGroupNames, '__ungrouped__']);
          return next;
        }
        return prev;
      });
    }
  }, [sortedGroupNames, ungrouped.length]);

  const toggleGroup = (name: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const collapseAll = () => setOpenGroups(new Set());
  const expandAll = () =>
    setOpenGroups(new Set([...sortedGroupNames, '__ungrouped__']));

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-500">
        Error loading exercises: {error.message}
      </div>
    );
  }

  const total = data?.pagination?.total ?? 0;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-rdy-gray-400">{total} exercises</span>
          <span className="text-rdy-gray-300">·</span>
          <button
            onClick={expandAll}
            className="text-xs text-rdy-gray-400 hover:text-rdy-black transition-colors"
          >
            Expand all
          </button>
          <span className="text-rdy-gray-300">·</span>
          <button
            onClick={collapseAll}
            className="text-xs text-rdy-gray-400 hover:text-rdy-black transition-colors"
          >
            Collapse all
          </button>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-rdy-orange-500 text-white hover:bg-rdy-orange-600"
        >
          + Add Exercise
        </Button>
      </div>

      {isLoading && (
        <div className="py-12 text-center text-rdy-gray-400">Loading…</div>
      )}

      {!isLoading && total === 0 && (
        <div className="rounded-lg border border-dashed border-rdy-gray-200 py-12 text-center text-rdy-gray-400">
          No exercises yet. Click <strong>+ Add Exercise</strong> to get started.
        </div>
      )}

      {/* Grouped sections */}
      <div className="space-y-3">
        {sortedGroupNames.map((name) => (
          <GroupSection
            key={name}
            name={name}
            exercises={grouped[name]}
            isOpen={openGroups.has(name)}
            onToggle={() => toggleGroup(name)}
            onEdit={setEditingExercise}
            onDelete={setDeletingExercise}
          />
        ))}

        {ungrouped.length > 0 && (
          <GroupSection
            name="Ungrouped"
            exercises={ungrouped}
            isOpen={openGroups.has('__ungrouped__')}
            onToggle={() => toggleGroup('__ungrouped__')}
            onEdit={setEditingExercise}
            onDelete={setDeletingExercise}
          />
        )}
      </div>

      {/* Dialogs */}
      <CreateExerciseDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          utils.exercises.list.invalidate();
          setShowCreateDialog(false);
        }}
      />
      <EditExerciseDialog
        open={!!editingExercise}
        onOpenChange={(open) => { if (!open) setEditingExercise(null); }}
        exercise={editingExercise}
        onSuccess={() => {
          utils.exercises.list.invalidate();
          setEditingExercise(null);
        }}
      />
      <DeleteExerciseDialog
        open={!!deletingExercise}
        onOpenChange={(open) => { if (!open) setDeletingExercise(null); }}
        exercise={deletingExercise}
        onSuccess={() => {
          utils.exercises.list.invalidate();
          setDeletingExercise(null);
        }}
      />
    </div>
  );
}
