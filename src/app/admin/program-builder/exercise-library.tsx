'use client';

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Search, ChevronDown, ChevronRight, GripVertical, FolderOpen, Folder } from 'lucide-react';

interface LibraryExercise {
  id: string;
  type: 'video' | 'audio' | 'text';
  groupName: string | null;
  titleDe: string;
  titleEn: string | null;
  durationMinutes: number | null;
  videoUrlDe: string | null;
  videoUrlEn: string | null;
  audioUrl: string | null;
  contentDe: string | null;
}

interface ExerciseRowProps {
  exercise: LibraryExercise;
}

function ExerciseRow({ exercise }: ExerciseRowProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('rdy-source', 'library');
    e.dataTransfer.setData('rdy-type', 'exercise');
    e.dataTransfer.setData('rdy-exercise-id', exercise.id);
    e.dataTransfer.effectAllowed = 'copy';
    e.stopPropagation();
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-rdy-gray-200/60 cursor-grab active:cursor-grabbing group select-none"
      title={exercise.titleEn || exercise.titleDe}
    >
      <GripVertical className="h-3.5 w-3.5 text-rdy-gray-300 shrink-0 group-hover:text-rdy-gray-400" />
      <span className="flex-1 truncate text-sm text-rdy-black">{exercise.titleDe}</span>
      {exercise.durationMinutes && (
        <span className="shrink-0 text-xs text-rdy-gray-400">{exercise.durationMinutes}m</span>
      )}
    </div>
  );
}

interface GroupSectionProps {
  name: string;
  exercises: LibraryExercise[];
  isOpen: boolean;
  onToggle: () => void;
}

function GroupSection({ name, exercises, isOpen, onToggle }: GroupSectionProps) {
  const handleGroupDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('rdy-source', 'library');
    e.dataTransfer.setData('rdy-type', 'group');
    e.dataTransfer.setData('rdy-group-name', name);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="rounded-lg border border-rdy-gray-200 overflow-hidden">
      {/* Group header — clickable to expand, draggable to add group to week */}
      <div
        className="flex items-center gap-2 px-2 py-2 bg-rdy-gray-100 cursor-pointer hover:bg-rdy-gray-200 select-none"
        onClick={onToggle}
      >
        <div
          draggable
          onDragStart={handleGroupDragStart}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-rdy-gray-300"
          title="Drag to add entire group to a week"
        >
          <GripVertical className="h-3.5 w-3.5 text-rdy-gray-400" />
        </div>
        {isOpen
          ? <FolderOpen className="h-3.5 w-3.5 text-rdy-orange-500 shrink-0" />
          : <Folder className="h-3.5 w-3.5 text-rdy-gray-400 shrink-0" />}
        <span className="flex-1 text-sm font-semibold text-rdy-black truncate">{name}</span>
        <span className="shrink-0 text-xs text-rdy-gray-400">{exercises.length}</span>
        {isOpen
          ? <ChevronDown className="h-3.5 w-3.5 text-rdy-gray-400 shrink-0" />
          : <ChevronRight className="h-3.5 w-3.5 text-rdy-gray-400 shrink-0" />}
      </div>

      {isOpen && (
        <div className="px-1 py-1 space-y-0.5">
          {exercises.map((ex) => (
            <ExerciseRow key={ex.id} exercise={ex} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ExerciseLibrary() {
  const [search, setSearch] = useState('');
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['__all__']));

  const { data, isLoading } = trpc.exercises.list.useQuery({
    type: 'all',
    sortBy: 'titleDe',
    sortOrder: 'asc',
    page: 1,
    limit: 500,
  });

  const { sortedGroupNames, grouped, ungrouped } = useMemo(() => {
    const all: LibraryExercise[] = (data?.exercises ?? []) as LibraryExercise[];
    const q = search.toLowerCase().trim();
    const filtered = q
      ? all.filter(
          (e) =>
            e.titleDe.toLowerCase().includes(q) ||
            (e.titleEn?.toLowerCase().includes(q) ?? false) ||
            (e.groupName?.toLowerCase().includes(q) ?? false)
        )
      : all;

    const grouped: Record<string, LibraryExercise[]> = {};
    const ungrouped: LibraryExercise[] = [];
    for (const ex of filtered) {
      const key = ex.groupName?.trim() || '';
      if (key) {
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
  }, [data?.exercises, search]);

  // Auto-open all groups once data loads
  useMemo(() => {
    if (sortedGroupNames.length > 0 || ungrouped.length > 0) {
      setOpenGroups((prev) => {
        if (prev.has('__all__')) {
          return new Set([...sortedGroupNames, '__ungrouped__']);
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

  const total = data?.exercises?.length ?? 0;

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-rdy-black">Exercise Library</p>
        <p className="text-xs text-rdy-gray-400">
          Drag an exercise or group onto a week
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-rdy-gray-400" />
        <input
          type="text"
          placeholder="Search exercises…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-rdy-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm placeholder:text-rdy-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rdy-orange-500"
        />
      </div>

      {/* Count + expand all */}
      {!isLoading && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-rdy-gray-400">{total} exercises</span>
          <button
            onClick={() => setOpenGroups(new Set([...sortedGroupNames, '__ungrouped__']))}
            className="text-xs text-rdy-gray-400 hover:text-rdy-black"
          >
            Expand all
          </button>
        </div>
      )}

      {/* Groups */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
        {isLoading && (
          <p className="text-center text-xs text-rdy-gray-400 py-4">Loading…</p>
        )}

        {!isLoading && total === 0 && (
          <p className="text-center text-xs text-rdy-gray-400 py-4">
            {search ? 'No exercises match your search' : 'No exercises yet'}
          </p>
        )}

        {sortedGroupNames.map((name) => (
          <GroupSection
            key={name}
            name={name}
            exercises={grouped[name]}
            isOpen={openGroups.has(name)}
            onToggle={() => toggleGroup(name)}
          />
        ))}

        {ungrouped.length > 0 && (
          <GroupSection
            name="Ungrouped"
            exercises={ungrouped}
            isOpen={openGroups.has('__ungrouped__')}
            onToggle={() => toggleGroup('__ungrouped__')}
          />
        )}
      </div>
    </div>
  );
}
