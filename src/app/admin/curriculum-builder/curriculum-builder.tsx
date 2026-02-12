'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PreviewMode } from './preview-mode';
import { TranslateDialog } from './translate-dialog';

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

interface WeekExercise {
  id: string;
  exerciseId: string;
  orderIndex: number;
  isObligatory: boolean;
  frequency: 'daily' | 'weekly' | 'custom';
  customFrequency: string | null;
  exercise: Exercise;
}

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
  exercises: WeekExercise[];
}

// Type is used internally by tRPC inference
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _Schwerpunktebene = {
  id: string;
  tenantId: string;
  monthNumber: string;
  titleDe: string;
  titleEn: string | null;
  descriptionDe: string | null;
  descriptionEn: string | null;
  herkunftDe: string | null;
  herkunftEn: string | null;
  zielDe: string | null;
  zielEn: string | null;
  imageUrl: string | null;
  weeks: Week[];
};

type DragItem = {
  type: 'schwerpunktebene' | 'week' | 'exercise';
  id: string;
  parentId?: string;
};

export function CurriculumBuilder() {
  const [activeTab, setActiveTab] = useState('builder');
  const [expandedSchwerpunktebenen, setExpandedSchwerpunktebenen] = useState<Set<string>>(
    new Set()
  );
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
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
    onSuccess: () => {
      utils.curriculumBuilder.getFullCurriculum.invalidate();
    },
  });

  const reorderWeeksMutation = trpc.curriculumBuilder.reorderWeeks.useMutation({
    onSuccess: () => {
      utils.curriculumBuilder.getFullCurriculum.invalidate();
    },
  });

  const reorderExercisesMutation = trpc.curriculumBuilder.reorderExercises.useMutation({
    onSuccess: () => {
      utils.curriculumBuilder.getFullCurriculum.invalidate();
    },
  });

  const updateObligatoryMutation = trpc.curriculumBuilder.updateExerciseObligatory.useMutation({
    onSuccess: () => {
      utils.curriculumBuilder.getFullCurriculum.invalidate();
    },
  });

  const toggleSchwerpunktebene = (id: string) => {
    setExpandedSchwerpunktebenen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleWeek = (id: string) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (!data?.curriculum) return;
    const allSchwerpunktebenen = new Set(data.curriculum.map((s) => s.id));
    const allWeeks = new Set(data.curriculum.flatMap((s) => s.weeks.map((w) => w.id)));
    setExpandedSchwerpunktebenen(allSchwerpunktebenen);
    setExpandedWeeks(allWeeks);
  };

  const collapseAll = () => {
    setExpandedSchwerpunktebenen(new Set());
    setExpandedWeeks(new Set());
  };

  // Drag and drop handlers
  const handleDragStart = (item: DragItem) => {
    setDraggedItem(item);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropSchwerpunktebene = async (targetId: string) => {
    if (!draggedItem || draggedItem.type !== 'schwerpunktebene' || !data?.curriculum) return;
    if (draggedItem.id === targetId) return;

    const ids = data.curriculum.map((s) => s.id);
    const draggedIndex = ids.indexOf(draggedItem.id);
    const targetIndex = ids.indexOf(targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newOrder = [...ids];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem.id);

    setDraggedItem(null);
    await reorderSchwerpunktebenenMutation.mutateAsync({ schwerpunktebeneIds: newOrder });
  };

  const handleDropWeek = async (targetId: string, parentId: string) => {
    if (!draggedItem || draggedItem.type !== 'week' || !data?.curriculum) return;
    if (draggedItem.id === targetId || draggedItem.parentId !== parentId) return;

    const schwerpunktebene = data.curriculum.find((s) => s.id === parentId);
    if (!schwerpunktebene) return;

    const ids = schwerpunktebene.weeks.map((w) => w.id);
    const draggedIndex = ids.indexOf(draggedItem.id);
    const targetIndex = ids.indexOf(targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newOrder = [...ids];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem.id);

    setDraggedItem(null);
    await reorderWeeksMutation.mutateAsync({ schwerpunktebeneId: parentId, weekIds: newOrder });
  };

  const handleDropExercise = async (targetId: string, parentId: string) => {
    if (!draggedItem || draggedItem.type !== 'exercise' || !data?.curriculum) return;
    if (draggedItem.id === targetId || draggedItem.parentId !== parentId) return;

    const week = data.curriculum.flatMap((s) => s.weeks).find((w) => w.id === parentId);
    if (!week) return;

    const ids = week.exercises.map((e) => e.id);
    const draggedIndex = ids.indexOf(draggedItem.id);
    const targetIndex = ids.indexOf(targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newOrder = [...ids];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem.id);

    setDraggedItem(null);
    await reorderExercisesMutation.mutateAsync({ weekId: parentId, weekExerciseIds: newOrder });
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleToggleObligatory = async (weekExerciseId: string, currentValue: boolean) => {
    await updateObligatoryMutation.mutateAsync({
      weekExerciseId,
      isObligatory: !currentValue,
    });
  };

  const openTranslateDialog = (
    text: string,
    sourceLang: 'de' | 'en',
    targetLang: 'de' | 'en',
    fieldName: string
  ) => {
    setTranslateField({ text, sourceLang, targetLang, fieldName });
    setShowTranslateDialog(true);
  };

  const getExerciseTypeIcon = (type: 'video' | 'audio' | 'text') => {
    switch (type) {
      case 'video':
        return '🎬';
      case 'audio':
        return '🎧';
      case 'text':
        return '📝';
    }
  };

  const getExerciseTypeBadgeClass = (type: 'video' | 'audio' | 'text') => {
    switch (type) {
      case 'video':
        return 'bg-rdy-orange-500/10 text-rdy-orange-500';
      case 'audio':
        return 'bg-rdy-orange-500/10 text-green-400';
      case 'text':
        return 'bg-rdy-orange-500/10 text-rdy-orange-500';
    }
  };

  const getMonthColor = (monthNumber: string) => {
    switch (monthNumber) {
      case '1':
        return 'bg-rdy-orange-500/10 text-rdy-orange-500 border-blue-800';
      case '2':
        return 'bg-rdy-orange-500/10 text-rdy-orange-500 border-purple-800';
      case '3':
        return 'bg-rdy-orange-500/10 text-green-400 border-green-800';
      default:
        return 'bg-rdy-gray-100/30 text-rdy-gray-400 border-rdy-gray-200';
    }
  };

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-500">
        Error loading curriculum: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList className="bg-rdy-gray-100">
            <TabsTrigger value="builder" className="data-[state=active]:bg-rdy-gray-200">
              Builder
            </TabsTrigger>
            <TabsTrigger value="preview" className="data-[state=active]:bg-rdy-gray-200">
              Preview
            </TabsTrigger>
          </TabsList>

          {activeTab === 'builder' && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={expandAll} className="border-rdy-gray-200">
                Expand All
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll} className="border-rdy-gray-200">
                Collapse All
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="builder" className="mt-6">
          {isLoading ? (
            <div className="py-8 text-center text-rdy-gray-400">Loading curriculum...</div>
          ) : !data?.curriculum?.length ? (
            <div className="rounded-lg border border-rdy-gray-200 bg-rdy-gray-100 p-8 text-center">
              <p className="text-rdy-gray-400">
                No curriculum data found. Start by creating Schwerpunktebenen, Weeks, and Exercises
                in their respective management pages.
              </p>
              <div className="mt-4 flex justify-center gap-4">
                <Button variant="outline" asChild className="border-rdy-gray-200">
                  <a href="/admin/schwerpunktebenen">Manage Schwerpunktebenen</a>
                </Button>
                <Button variant="outline" asChild className="border-rdy-gray-200">
                  <a href="/admin/exercises">Manage Exercises</a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-rdy-gray-500">
                Drag and drop items to reorder. Click to expand/collapse sections.
              </p>

              {data.curriculum.map((schwerpunktebene) => (
                <Card
                  key={schwerpunktebene.id}
                  className={`border-rdy-gray-200 bg-rdy-gray-100 ${
                    draggedItem?.type === 'schwerpunktebene' && draggedItem.id === schwerpunktebene.id
                      ? 'opacity-50'
                      : ''
                  }`}
                  draggable
                  onDragStart={() =>
                    handleDragStart({ type: 'schwerpunktebene', id: schwerpunktebene.id })
                  }
                  onDragOver={handleDragOver}
                  onDrop={() => handleDropSchwerpunktebene(schwerpunktebene.id)}
                  onDragEnd={handleDragEnd}
                >
                  <CardHeader
                    className="cursor-pointer"
                    onClick={() => toggleSchwerpunktebene(schwerpunktebene.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="cursor-move text-rdy-gray-500" title="Drag to reorder">
                          ⋮⋮
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getMonthColor(schwerpunktebene.monthNumber)}`}
                        >
                          Month {schwerpunktebene.monthNumber}
                        </span>
                        <CardTitle className="text-lg text-rdy-black">
                          {schwerpunktebene.titleDe}
                        </CardTitle>
                        {schwerpunktebene.titleEn && (
                          <span className="text-sm text-rdy-gray-500">({schwerpunktebene.titleEn})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-rdy-gray-500">
                          {schwerpunktebene.weeks.length} weeks
                        </span>
                        <span className="text-rdy-gray-400">
                          {expandedSchwerpunktebenen.has(schwerpunktebene.id) ? '▼' : '▶'}
                        </span>
                      </div>
                    </div>
                    {schwerpunktebene.zielDe && (
                      <p className="mt-2 text-sm text-rdy-gray-400">
                        Goal: {schwerpunktebene.zielDe}
                        {!schwerpunktebene.zielEn && (
                          <button
                            className="ml-2 text-xs text-rdy-orange-500 hover:text-rdy-orange-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              openTranslateDialog(schwerpunktebene.zielDe!, 'de', 'en', 'Goal (EN)');
                            }}
                          >
                            [Translate to EN]
                          </button>
                        )}
                      </p>
                    )}
                  </CardHeader>

                  {expandedSchwerpunktebenen.has(schwerpunktebene.id) && (
                    <CardContent className="space-y-3 pt-0">
                      {schwerpunktebene.weeks.length === 0 ? (
                        <p className="py-4 text-center text-sm text-rdy-gray-500">
                          No weeks in this Schwerpunktebene.{' '}
                          <a
                            href={`/admin/weeks?schwerpunktebeneId=${schwerpunktebene.id}`}
                            className="text-rdy-orange-500 hover:text-rdy-orange-500"
                          >
                            Add weeks
                          </a>
                        </p>
                      ) : (
                        schwerpunktebene.weeks.map((week) => (
                          <div
                            key={week.id}
                            className={`ml-6 rounded-lg border border-rdy-gray-200 bg-rdy-gray-100 ${
                              draggedItem?.type === 'week' && draggedItem.id === week.id
                                ? 'opacity-50'
                                : ''
                            }`}
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              handleDragStart({
                                type: 'week',
                                id: week.id,
                                parentId: schwerpunktebene.id,
                              });
                            }}
                            onDragOver={(e) => {
                              e.stopPropagation();
                              handleDragOver(e);
                            }}
                            onDrop={(e) => {
                              e.stopPropagation();
                              handleDropWeek(week.id, schwerpunktebene.id);
                            }}
                            onDragEnd={handleDragEnd}
                          >
                            <div
                              className="flex cursor-pointer items-center justify-between p-3"
                              onClick={() => toggleWeek(week.id)}
                            >
                              <div className="flex items-center gap-3">
                                <span className="cursor-move text-rdy-gray-500" title="Drag to reorder">
                                  ⋮⋮
                                </span>
                                <span className="inline-flex items-center rounded-full bg-rdy-orange-500/10 px-2 py-1 text-xs font-medium text-rdy-orange-500">
                                  Week {week.weekNumber}
                                </span>
                                <span className="font-medium text-rdy-black">{week.titleDe}</span>
                                {week.titleEn && (
                                  <span className="text-sm text-rdy-gray-500">({week.titleEn})</span>
                                )}
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-sm text-rdy-gray-500">
                                  {week.exercises.length} exercises
                                </span>
                                <span className="text-rdy-gray-400">
                                  {expandedWeeks.has(week.id) ? '▼' : '▶'}
                                </span>
                              </div>
                            </div>

                            {expandedWeeks.has(week.id) && (
                              <div className="border-t border-rdy-gray-200 p-3 pt-2">
                                {week.exercises.length === 0 ? (
                                  <p className="py-2 text-center text-sm text-rdy-gray-500">
                                    No exercises in this week.
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {week.exercises.map((we) => (
                                      <div
                                        key={we.id}
                                        className={`ml-4 flex items-center justify-between rounded border border-rdy-gray-200 bg-rdy-gray-200/50 p-2 ${
                                          draggedItem?.type === 'exercise' &&
                                          draggedItem.id === we.id
                                            ? 'opacity-50'
                                            : ''
                                        }`}
                                        draggable
                                        onDragStart={(e) => {
                                          e.stopPropagation();
                                          handleDragStart({
                                            type: 'exercise',
                                            id: we.id,
                                            parentId: week.id,
                                          });
                                        }}
                                        onDragOver={(e) => {
                                          e.stopPropagation();
                                          handleDragOver(e);
                                        }}
                                        onDrop={(e) => {
                                          e.stopPropagation();
                                          handleDropExercise(we.id, week.id);
                                        }}
                                        onDragEnd={handleDragEnd}
                                      >
                                        <div className="flex items-center gap-3">
                                          <span
                                            className="cursor-move text-rdy-gray-500"
                                            title="Drag to reorder"
                                          >
                                            ⋮⋮
                                          </span>
                                          <span className="text-lg">
                                            {getExerciseTypeIcon(we.exercise.type)}
                                          </span>
                                          <span
                                            className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${getExerciseTypeBadgeClass(we.exercise.type)}`}
                                          >
                                            {we.exercise.type}
                                          </span>
                                          <span className="text-sm text-rdy-black">
                                            {we.exercise.titleDe}
                                          </span>
                                          {we.exercise.titleEn && (
                                            <span className="text-xs text-rdy-gray-500">
                                              ({we.exercise.titleEn})
                                            </span>
                                          )}
                                          {we.exercise.durationMinutes && (
                                            <span className="text-xs text-rdy-gray-500">
                                              {we.exercise.durationMinutes} min
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                          <div className="flex items-center gap-2">
                                            <span
                                              className={`text-xs ${we.isObligatory ? 'text-rdy-orange-500' : 'text-rdy-gray-500'}`}
                                            >
                                              {we.isObligatory ? 'Obligatory' : 'Optional'}
                                            </span>
                                            <Switch
                                              checked={we.isObligatory}
                                              onCheckedChange={() =>
                                                handleToggleObligatory(we.id, we.isObligatory)
                                              }
                                              className="data-[state=checked]:bg-orange-600"
                                            />
                                          </div>
                                          <span className="text-xs text-rdy-gray-500">
                                            {we.frequency}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          <PreviewMode curriculum={data?.curriculum || []} />
        </TabsContent>
      </Tabs>

      {/* Translate Dialog */}
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
