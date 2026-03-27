'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AssignCurriculumDialog } from './assign-curriculum-dialog';
import { Loader2 } from 'lucide-react';

interface ClassCurriculumTabProps {
  classId: string;
  durationLevels: number;
}

interface CurriculumEntry {
  id: string;
  classId: string;
  schwerpunktebeneId: string;
  levelNumber: number;
  customTitleDe: string | null;
  customTitleEn: string | null;
  customDescriptionDe: string | null;
  customDescriptionEn: string | null;
  mentorNotes: string | null;
  schwerpunktebene: {
    id: string;
    titleDe: string;
    titleEn: string | null;
    descriptionDe: string | null;
    descriptionEn: string | null;
  };
}

export function ClassCurriculumTab({ classId, durationLevels }: ClassCurriculumTabProps) {
  const [assigningMonth, setAssigningMonth] = useState<number | null>(null);
  const [editingCurriculum, setEditingCurriculum] = useState<CurriculumEntry | null>(null);
  const [scheduleResult, setScheduleResult] = useState<{ count: number } | null>(null);

  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.classes.getCurriculum.useQuery({ id: classId });

  const removeCurriculumMutation = trpc.classes.removeCurriculum.useMutation({
    onSuccess: () => {
      utils.classes.getCurriculum.invalidate({ id: classId });
    },
  });

  const scheduleMutation = trpc.classes.scheduleClassExercises.useMutation({
    onSuccess: (result) => {
      setScheduleResult(result);
    },
  });

  const handleGenerateSchedule = () => {
    setScheduleResult(null);
    scheduleMutation.mutate({ classId });
  };

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-500">
        Error loading Programm: {error.message}
      </div>
    );
  }

  // Create a map of level number to curriculum entry
  const curriculumByLevel: Record<number, CurriculumEntry> = {};
  if (data?.curriculum) {
    for (const entry of data.curriculum) {
      curriculumByLevel[entry.levelNumber] = entry;
    }
  }

  // Generate level cards based on class duration
  const months = Array.from({ length: durationLevels }, (_, i) => i + 1);

  const handleRemove = async (levelNumber: number) => {
    if (confirm('Are you sure you want to remove this Modul assignment?')) {
      await removeCurriculumMutation.mutateAsync({ classId, levelNumber });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-rdy-black">Programm Module</h3>
          <p className="text-sm text-rdy-gray-400">
            Assign a Modul to each slot in the class
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-rdy-gray-400">Loading Programm...</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {months.map((levelNumber) => {
            const curriculum = curriculumByLevel[levelNumber];

            return (
              <Card key={levelNumber} className="border-rdy-gray-200 bg-rdy-gray-100">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-rdy-black">
                    <span>Modul {levelNumber}</span>
                    {curriculum && (
                      <span className="rounded-full bg-green-50 px-2 py-1 text-xs text-green-600">
                        Assigned
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription className="text-rdy-gray-400">
                    {curriculum
                      ? curriculum.customTitleDe || curriculum.schwerpunktebene.titleDe
                      : 'No Modul assigned'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {curriculum ? (
                    <div className="space-y-3">
                      <p className="line-clamp-2 text-sm text-rdy-gray-400">
                        {curriculum.customDescriptionDe ||
                          curriculum.schwerpunktebene.descriptionDe ||
                          'No description'}
                      </p>
                      {curriculum.mentorNotes && (
                        <div className="rounded-lg bg-blue-50 p-2">
                          <p className="text-xs text-rdy-orange-500">Mentor Notes:</p>
                          <p className="line-clamp-2 text-sm text-rdy-gray-600">
                            {curriculum.mentorNotes}
                          </p>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingCurriculum(curriculum)}
                          className="flex-1 border-rdy-gray-200 text-rdy-gray-600 hover:bg-rdy-gray-200"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemove(levelNumber)}
                          disabled={removeCurriculumMutation.isPending}
                          className="flex-1 border-rdy-gray-200 text-red-400 hover:bg-red-50 hover:text-red-300"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full border-dashed border-rdy-gray-200 text-rdy-gray-400 hover:border-rdy-gray-400 hover:bg-rdy-gray-100 hover:text-rdy-black"
                      onClick={() => setAssigningMonth(levelNumber)}
                    >
                      + Modul zuweisen
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Generate Schedule Section */}
      <div className="rounded-lg border border-rdy-gray-200 bg-rdy-gray-100 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-rdy-black">Exercise Schedule</p>
            <p className="text-xs text-rdy-gray-400">
              Generate concrete exercise dates for all class members based on the curriculum and day-picker settings.
              Re-running will replace any existing scheduled exercises for this class.
            </p>
            {scheduleMutation.error && (
              <p className="mt-1 text-xs text-red-500">{scheduleMutation.error.message}</p>
            )}
            {scheduleResult && (
              <p className="mt-1 text-xs text-green-600">
                ✓ {scheduleResult.count} exercise{scheduleResult.count !== 1 ? 's' : ''} scheduled for class members
              </p>
            )}
            {!isLoading && data && data.curriculum.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">⚠ Kein Programm zugewiesen — zuerst Module zuweisen.</p>
            )}
          </div>
          <Button
            onClick={handleGenerateSchedule}
            disabled={scheduleMutation.isPending || isLoading || (data?.curriculum.length ?? 0) === 0}
            className="shrink-0 bg-rdy-orange-500 text-white hover:bg-rdy-orange-600 disabled:opacity-50"
          >
            {scheduleMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              'Generate Schedule'
            )}
          </Button>
        </div>
      </div>

      {/* Assign Curriculum Dialog */}
      <AssignCurriculumDialog
        open={assigningMonth !== null || editingCurriculum !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAssigningMonth(null);
            setEditingCurriculum(null);
          }
        }}
        classId={classId}
        levelNumber={editingCurriculum?.levelNumber ?? assigningMonth ?? 1}
        existingCurriculum={editingCurriculum}
        onSuccess={() => {
          utils.classes.getCurriculum.invalidate({ id: classId });
          setAssigningMonth(null);
          setEditingCurriculum(null);
        }}
      />
    </div>
  );
}
