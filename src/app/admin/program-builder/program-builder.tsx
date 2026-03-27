'use client';

import { useState, useRef } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GripVertical, X } from 'lucide-react';
import { PreviewMode } from './preview-mode';
import { TranslateDialog } from './translate-dialog';
import { ExerciseLibrary } from './exercise-library';

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface WeekExercise {
  id: string;
  exerciseId: string;
  orderIndex: number;
  isObligatory: boolean;
  frequency: 'daily' | 'weekly' | 'custom';
  customFrequency: string | null;
  applicableDays: number[] | null;
  exercise: Exercise;
}

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function ExerciseDayPicker({
  weekExerciseId,
  initialDays,
  onSave,
}: {
  weekExerciseId: string;
  initialDays: number[] | null;
  onSave: (id: string, days: number[] | null) => void;
}) {
  const [days, setDays] = useState<number[]>(initialDays ?? ALL_DAYS);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggle = (day: number) => {
    setDays((prev) => {
      const next = prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort((a, b) => a - b);
      // Prevent deselecting all days
      const result = next.length === 0 ? [day] : next;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSave(weekExerciseId, result.length === 7 ? null : result);
      }, 400);
      return result;
    });
  };

  return (
    <div className="flex gap-0.5">
      {ALL_DAYS.map((day, i) => (
        <button
          key={day}
          onClick={(e) => { e.stopPropagation(); toggle(day); }}
          title={DAY_LABELS[i]}
          className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold transition-colors ${
            days.includes(day)
              ? 'bg-rdy-orange-500 text-white'
              : 'bg-rdy-gray-200 text-rdy-gray-400 hover:bg-rdy-gray-300'
          }`}
        >
          {DAY_LABELS[i]}
        </button>
      ))}
    </div>
  );
}

type DragItem = {
  type: 'schwerpunktebene' | 'week' | 'exercise';
  id: string;
  parentId?: string;
};

export function ProgramBuilder() {
  const [activeTab, setActiveTab] = useState('builder');
  const [expandedSchwerpunktebenen, setExpandedSchwerpunktebenen] = useState<Set<string>>(new Set());
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [dragOverWeekId, setDragOverWeekId] = useState<string | null>(null);
  const [showTranslateDialog, setShowTranslateDialog] = useState(false);
  const [translateField, setTranslateField] = useState<{
    text: string;
    sourceLang: 'de' | 'en';
    targetLang: 'de' | 'en';
    fieldName: string;
  } | null>(null);

  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.curriculumBuilder.getFullCurriculum.useQuery();

  const reorderSchwerpunktebenenMutation = trpc.curriculumBuilder.reorderSchwerpunktebenen.useMutation({
    onSuccess: () => utils.curriculumBuilder.getFullCurriculum.invalidate(),
  });
  const reorderWeeksMutation = trpc.curriculumBuilder.reorderWeeks.useMutation({
    onSuccess: () => utils.curriculumBuilder.getFullCurriculum.invalidate(),
  });
  const reorderExercisesMutation = trpc.curriculumBuilder.reorderExercises.useMutation({
    onSuccess: () => utils.curriculumBuilder.getFullCurriculum.invalidate(),
  });
  const updateObligatoryMutation = trpc.curriculumBuilder.updateExerciseObligatory.useMutation({
    onSuccess: () => utils.curriculumBuilder.getFullCurriculum.invalidate(),
  });
  const addExerciseToWeekMutation = trpc.curriculumBuilder.addExerciseToWeek.useMutation({
    onSuccess: () => utils.curriculumBuilder.getFullCurriculum.invalidate(),
  });
  const addGroupToWeekMutation = trpc.curriculumBuilder.addGroupToWeek.useMutation({
    onSuccess: () => utils.curriculumBuilder.getFullCurriculum.invalidate(),
  });
  const removeExerciseFromWeekMutation = trpc.curriculumBuilder.removeExerciseFromWeek.useMutation({
    onSuccess: () => utils.curriculumBuilder.getFullCurriculum.invalidate(),
  });
  const updateExerciseDaysMutation = trpc.curriculumBuilder.updateExerciseDays.useMutation();

  const handleUpdateDays = (weekExerciseId: string, applicableDays: number[] | null) => {
    updateExerciseDaysMutation.mutate({ weekExerciseId, applicableDays });
  };

  const toggleSchwerpunktebene = (id: string) => {
    setExpandedSchwerpunktebenen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleWeek = (id: string) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    if (!data?.curriculum) return;
    setExpandedSchwerpunktebenen(new Set(data.curriculum.map((s) => s.id)));
    setExpandedWeeks(new Set(data.curriculum.flatMap((s) => s.weeks.map((w) => w.id))));
  };

  const collapseAll = () => {
    setExpandedSchwerpunktebenen(new Set());
    setExpandedWeeks(new Set());
  };

  // ── Internal reorder drag (grip handles only) ─────────────────────────────

  const handleGripDragStart = (e: React.DragEvent, item: DragItem) => {
    e.stopPropagation();
    setDraggedItem(item);
  };
  const handleDragEnd = () => setDraggedItem(null);

  const handleDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('rdy-source')) {
      e.preventDefault();
    }
  };

  const handleDropSchwerpunktebene = async (e: React.DragEvent, targetId: string) => {
    if (e.dataTransfer.types.includes('rdy-source')) return; // library drop, ignore
    if (!draggedItem || draggedItem.type !== 'schwerpunktebene' || !data?.curriculum) return;
    if (draggedItem.id === targetId) return;

    const ids = data.curriculum.map((s) => s.id);
    const di = ids.indexOf(draggedItem.id);
    const ti = ids.indexOf(targetId);
    if (di === -1 || ti === -1) return;

    const newOrder = [...ids];
    newOrder.splice(di, 1);
    newOrder.splice(ti, 0, draggedItem.id);
    setDraggedItem(null);
    await reorderSchwerpunktebenenMutation.mutateAsync({ schwerpunktebeneIds: newOrder });
  };

  const handleDropWeek = async (e: React.DragEvent, targetId: string, parentId: string) => {
    if (e.dataTransfer.types.includes('rdy-source')) return;
    if (!draggedItem || draggedItem.type !== 'week' || !data?.curriculum) return;
    if (draggedItem.id === targetId || draggedItem.parentId !== parentId) return;

    const sp = data.curriculum.find((s) => s.id === parentId);
    if (!sp) return;

    const ids = sp.weeks.map((w) => w.id);
    const di = ids.indexOf(draggedItem.id);
    const ti = ids.indexOf(targetId);
    if (di === -1 || ti === -1) return;

    const newOrder = [...ids];
    newOrder.splice(di, 1);
    newOrder.splice(ti, 0, draggedItem.id);
    setDraggedItem(null);
    await reorderWeeksMutation.mutateAsync({ schwerpunktebeneId: parentId, weekIds: newOrder });
  };

  const handleDropExercise = async (e: React.DragEvent, targetId: string, parentId: string) => {
    if (e.dataTransfer.types.includes('rdy-source')) return;
    if (!draggedItem || draggedItem.type !== 'exercise' || !data?.curriculum) return;
    if (draggedItem.id === targetId || draggedItem.parentId !== parentId) return;

    const week = data.curriculum.flatMap((s) => s.weeks).find((w) => w.id === parentId);
    if (!week) return;

    const ids = week.exercises.map((ex) => ex.id);
    const di = ids.indexOf(draggedItem.id);
    const ti = ids.indexOf(targetId);
    if (di === -1 || ti === -1) return;

    const newOrder = [...ids];
    newOrder.splice(di, 1);
    newOrder.splice(ti, 0, draggedItem.id);
    setDraggedItem(null);
    await reorderExercisesMutation.mutateAsync({ weekId: parentId, weekExerciseIds: newOrder });
  };

  // ── Library drop zone ─────────────────────────────────────────────────────

  const handleLibraryDragOver = (e: React.DragEvent, weekId: string) => {
    if (!e.dataTransfer.types.includes('rdy-source')) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOverWeekId(weekId);
  };

  const handleLibraryDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverWeekId(null);
    }
  };

  const handleLibraryDrop = async (e: React.DragEvent, weekId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverWeekId(null);
    if (e.dataTransfer.getData('rdy-source') !== 'library') return;
    const type = e.dataTransfer.getData('rdy-type');
    if (type === 'exercise') {
      const exerciseId = e.dataTransfer.getData('rdy-exercise-id');
      if (exerciseId) await addExerciseToWeekMutation.mutateAsync({ weekId, exerciseId });
    } else if (type === 'group') {
      const groupName = e.dataTransfer.getData('rdy-group-name');
      if (groupName) await addGroupToWeekMutation.mutateAsync({ weekId, groupName });
    }
  };

  const handleToggleObligatory = async (weekExerciseId: string, currentValue: boolean) => {
    await updateObligatoryMutation.mutateAsync({ weekExerciseId, isObligatory: !currentValue });
  };

  const openTranslateDialog = (text: string, sourceLang: 'de' | 'en', targetLang: 'de' | 'en', fieldName: string) => {
    setTranslateField({ text, sourceLang, targetLang, fieldName });
    setShowTranslateDialog(true);
  };

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-500">
        Error loading program: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList className="bg-rdy-gray-100">
            <TabsTrigger value="builder" className="data-[state=active]:bg-rdy-gray-200">Builder</TabsTrigger>
            <TabsTrigger value="preview" className="data-[state=active]:bg-rdy-gray-200">Preview</TabsTrigger>
          </TabsList>
          {activeTab === 'builder' && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={expandAll} className="border-rdy-gray-200 text-rdy-gray-600">Expand All</Button>
              <Button variant="outline" size="sm" onClick={collapseAll} className="border-rdy-gray-200 text-rdy-gray-600">Collapse All</Button>
            </div>
          )}
        </div>

        <TabsContent value="builder" className="mt-4">
          {isLoading ? (
            <div className="py-8 text-center text-rdy-gray-400">Loading program…</div>
          ) : (
            <div className="flex gap-4" style={{ minHeight: '70vh' }}>

              {/* ── Left: tree ───────────────────────────────────── */}
              <div className="min-w-0 flex-1 overflow-y-auto space-y-2">
                {!data?.curriculum?.length ? (
                  <div className="rounded-lg border border-rdy-gray-200 bg-rdy-gray-100 p-8 text-center">
                    <p className="text-rdy-gray-400">No program data yet.</p>
                    <div className="mt-4 flex justify-center gap-4">
                      <Button variant="outline" asChild className="border-rdy-gray-200">
                        <a href="/admin/levels">Module verwalten</a>
                      </Button>
                      <Button variant="outline" asChild className="border-rdy-gray-200">
                        <a href="/admin/exercises">Manage Exercises</a>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-rdy-gray-400">Grab ⠿ to reorder · Click title to expand · Drag exercises from library →</p>

                    {data.curriculum.map((sp) => (
                      <div
                        key={sp.id}
                        className={`rounded-lg border border-rdy-gray-200 bg-rdy-gray-100 transition-opacity ${
                          draggedItem?.type === 'schwerpunktebene' && draggedItem.id === sp.id ? 'opacity-40' : ''
                        }`}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropSchwerpunktebene(e, sp.id)}
                      >
                        {/* Schwerpunktebene header */}
                        <div className="flex items-center gap-2 px-3 py-2.5">
                          <span
                            draggable
                            onDragStart={(e) => handleGripDragStart(e, { type: 'schwerpunktebene', id: sp.id })}
                            onDragEnd={handleDragEnd}
                            className="shrink-0 cursor-grab active:cursor-grabbing text-rdy-gray-300 hover:text-rdy-gray-500"
                          >
                            <GripVertical className="h-4 w-4" />
                          </span>
                          <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-rdy-gray-200 text-rdy-gray-600 shrink-0">
                            Modul {sp.levelNumber}
                          </span>
                          <button
                            className="flex-1 flex items-center gap-2 text-left min-w-0"
                            onClick={() => toggleSchwerpunktebene(sp.id)}
                          >
                            <span className="font-semibold text-rdy-black truncate">{sp.titleDe}</span>
                            {sp.titleEn && <span className="text-xs text-rdy-gray-400 truncate">({sp.titleEn})</span>}
                            <span className="text-xs text-rdy-gray-400 shrink-0 ml-auto">
                              {sp.weeks.length}w
                            </span>
                            <span className="text-xs text-rdy-gray-400 shrink-0">
                              {expandedSchwerpunktebenen.has(sp.id) ? '▼' : '▶'}
                            </span>
                          </button>
                        </div>
                        {sp.zielDe && expandedSchwerpunktebenen.has(sp.id) && (
                          <p className="px-10 pb-1 text-xs text-rdy-gray-400">
                            Goal: {sp.zielDe}
                            {!sp.zielEn && (
                              <button
                                className="ml-2 text-rdy-orange-500 hover:underline"
                                onClick={() => openTranslateDialog(sp.zielDe!, 'de', 'en', 'Goal (EN)')}
                              >
                                [Translate]
                              </button>
                            )}
                          </p>
                        )}

                        {/* Weeks */}
                        {expandedSchwerpunktebenen.has(sp.id) && (
                          <div className="px-3 pb-3 space-y-2">
                            {sp.weeks.length === 0 ? (
                              <p className="text-center text-sm text-rdy-gray-400 py-3">
                                No weeks.{' '}
                                <a href={`/admin/weeks?schwerpunktebeneId=${sp.id}`} className="text-rdy-orange-500 hover:underline">
                                  Add weeks
                                </a>
                              </p>
                            ) : (
                              sp.weeks.map((week) => (
                                <div
                                  key={week.id}
                                  className={`rounded-lg border border-rdy-gray-200 bg-white ml-2 transition-opacity ${
                                    draggedItem?.type === 'week' && draggedItem.id === week.id ? 'opacity-40' : ''
                                  }`}
                                  onDragOver={(e) => { e.stopPropagation(); handleDragOver(e); }}
                                  onDrop={(e) => { e.stopPropagation(); handleDropWeek(e, week.id, sp.id); }}
                                >
                                  {/* Week header */}
                                  <div className="flex items-center gap-2 px-3 py-2">
                                    <span
                                      draggable
                                      onDragStart={(e) => handleGripDragStart(e, { type: 'week', id: week.id, parentId: sp.id })}
                                      onDragEnd={handleDragEnd}
                                      className="shrink-0 cursor-grab active:cursor-grabbing text-rdy-gray-300 hover:text-rdy-gray-500"
                                    >
                                      <GripVertical className="h-4 w-4" />
                                    </span>
                                    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-rdy-gray-200 text-rdy-gray-600 shrink-0">
                                      W{week.weekNumber}
                                    </span>
                                    <button
                                      className="flex-1 flex items-center gap-2 text-left min-w-0"
                                      onClick={() => toggleWeek(week.id)}
                                    >
                                      <span className="text-sm font-medium text-rdy-black truncate">{week.titleDe}</span>
                                      {week.titleEn && <span className="text-xs text-rdy-gray-400 truncate">({week.titleEn})</span>}
                                      <span className="text-xs text-rdy-gray-400 shrink-0 ml-auto">{week.exercises.length}ex</span>
                                      <span className="text-xs text-rdy-gray-400 shrink-0">
                                        {expandedWeeks.has(week.id) ? '▼' : '▶'}
                                      </span>
                                    </button>
                                  </div>

                                  {/* Exercises + drop zone */}
                                  {expandedWeeks.has(week.id) && (
                                    <div className="border-t border-rdy-gray-100 px-3 pb-2 pt-1.5 space-y-1">
                                      {week.exercises.map((we) => (
                                        <div
                                          key={we.id}
                                          className={`group flex flex-col rounded border border-rdy-gray-100 bg-rdy-gray-100/50 transition-opacity ${
                                            draggedItem?.type === 'exercise' && draggedItem.id === we.id ? 'opacity-40' : ''
                                          }`}
                                          onDragOver={(e) => { e.stopPropagation(); handleDragOver(e); }}
                                          onDrop={(e) => { e.stopPropagation(); handleDropExercise(e, we.id, week.id); }}
                                        >
                                          {/* Line 1: grip + title + duration + controls */}
                                          <div className="flex items-center gap-2 px-2 pt-1.5 pb-0.5">
                                            <span
                                              draggable
                                              onDragStart={(e) => handleGripDragStart(e, { type: 'exercise', id: we.id, parentId: week.id })}
                                              onDragEnd={handleDragEnd}
                                              className="shrink-0 cursor-grab active:cursor-grabbing text-rdy-gray-300 hover:text-rdy-gray-500"
                                            >
                                              <GripVertical className="h-3.5 w-3.5" />
                                            </span>
                                            <span className="flex-1 truncate text-sm text-rdy-black">{we.exercise.titleDe}</span>
                                            {we.exercise.durationMinutes && (
                                              <span className="shrink-0 text-xs text-rdy-gray-400">{we.exercise.durationMinutes}m</span>
                                            )}
                                            <div className="flex shrink-0 items-center gap-2">
                                              <span className={`text-xs ${we.isObligatory ? 'text-rdy-orange-500' : 'text-rdy-gray-400'}`}>
                                                {we.isObligatory ? 'Req' : 'Opt'}
                                              </span>
                                              <Switch
                                                checked={we.isObligatory}
                                                onCheckedChange={() => handleToggleObligatory(we.id, we.isObligatory)}
                                                className="data-[state=checked]:bg-rdy-orange-500 h-4 w-7"
                                              />
                                              <button
                                                onClick={() => removeExerciseFromWeekMutation.mutate({ weekExerciseId: we.id })}
                                                className="text-rdy-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                                                title="Remove from week"
                                              >
                                                <X className="h-3.5 w-3.5" />
                                              </button>
                                            </div>
                                          </div>
                                          {/* Line 2: day picker */}
                                          <div className="px-2 pb-1.5 pl-7">
                                            <ExerciseDayPicker
                                              weekExerciseId={we.id}
                                              initialDays={we.applicableDays}
                                              onSave={handleUpdateDays}
                                            />
                                          </div>
                                        </div>
                                      ))}

                                      {/* Library drop zone */}
                                      <div
                                        className={`mt-1 rounded border-2 border-dashed py-2 text-center text-xs transition-colors ${
                                          dragOverWeekId === week.id
                                            ? 'border-rdy-orange-500 bg-rdy-orange-500/10 text-rdy-orange-500'
                                            : 'border-rdy-gray-200 text-rdy-gray-400'
                                        }`}
                                        onDragOver={(e) => handleLibraryDragOver(e, week.id)}
                                        onDragLeave={handleLibraryDragLeave}
                                        onDrop={(e) => handleLibraryDrop(e, week.id)}
                                      >
                                        {dragOverWeekId === week.id ? '+ Drop to add' : 'Drop exercises here'}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* ── Right: Exercise Library ───────────────────────── */}
              <div className="w-80 shrink-0 overflow-hidden rounded-lg border border-rdy-gray-200 bg-white p-3">
                <ExerciseLibrary />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          <PreviewMode curriculum={data?.curriculum || []} />
        </TabsContent>
      </Tabs>

      <TranslateDialog
        open={showTranslateDialog}
        onOpenChange={setShowTranslateDialog}
        initialText={translateField?.text || ''}
        sourceLang={translateField?.sourceLang || 'de'}
        targetLang={translateField?.targetLang || 'en'}
        fieldName={translateField?.fieldName || ''}
      />
    </div>
  );
}
