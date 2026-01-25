'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AssignCurriculumDialog } from './assign-curriculum-dialog';

interface ClassCurriculumTabProps {
  classId: string;
  durationMonths: number;
}

interface CurriculumEntry {
  id: string;
  classId: string;
  schwerpunktebeneId: string;
  monthNumber: number;
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

export function ClassCurriculumTab({ classId, durationMonths }: ClassCurriculumTabProps) {
  const [assigningMonth, setAssigningMonth] = useState<number | null>(null);
  const [editingCurriculum, setEditingCurriculum] = useState<CurriculumEntry | null>(null);

  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.classes.getCurriculum.useQuery({ id: classId });

  const removeCurriculumMutation = trpc.classes.removeCurriculum.useMutation({
    onSuccess: () => {
      utils.classes.getCurriculum.invalidate({ id: classId });
    },
  });

  if (error) {
    return (
      <div className="rounded-lg bg-red-900/20 p-4 text-red-400">
        Error loading curriculum: {error.message}
      </div>
    );
  }

  // Create a map of month number to curriculum entry
  const curriculumByMonth: Record<number, CurriculumEntry> = {};
  if (data?.curriculum) {
    for (const entry of data.curriculum) {
      curriculumByMonth[entry.monthNumber] = entry;
    }
  }

  // Generate month cards based on class duration
  const months = Array.from({ length: durationMonths }, (_, i) => i + 1);

  const handleRemove = async (monthNumber: number) => {
    if (confirm('Are you sure you want to remove this curriculum assignment?')) {
      await removeCurriculumMutation.mutateAsync({ classId, monthNumber });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-white">Curriculum Plan</h3>
          <p className="text-sm text-gray-400">
            Assign focus areas (Schwerpunktebenen) to each month of the class
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-gray-400">Loading curriculum...</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {months.map((monthNumber) => {
            const curriculum = curriculumByMonth[monthNumber];

            return (
              <Card key={monthNumber} className="border-gray-800 bg-gray-900">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-white">
                    <span>Month {monthNumber}</span>
                    {curriculum && (
                      <span className="rounded-full bg-green-900/30 px-2 py-1 text-xs text-green-400">
                        Assigned
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    {curriculum
                      ? curriculum.customTitleDe || curriculum.schwerpunktebene.titleDe
                      : 'No focus area assigned'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {curriculum ? (
                    <div className="space-y-3">
                      <p className="line-clamp-2 text-sm text-gray-400">
                        {curriculum.customDescriptionDe ||
                          curriculum.schwerpunktebene.descriptionDe ||
                          'No description'}
                      </p>
                      {curriculum.mentorNotes && (
                        <div className="rounded-lg bg-blue-900/20 p-2">
                          <p className="text-xs text-blue-400">Mentor Notes:</p>
                          <p className="line-clamp-2 text-sm text-gray-300">
                            {curriculum.mentorNotes}
                          </p>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingCurriculum(curriculum)}
                          className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemove(monthNumber)}
                          disabled={removeCurriculumMutation.isPending}
                          className="flex-1 border-gray-700 text-red-400 hover:bg-red-900/20 hover:text-red-300"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full border-dashed border-gray-700 text-gray-400 hover:border-gray-600 hover:bg-gray-800 hover:text-white"
                      onClick={() => setAssigningMonth(monthNumber)}
                    >
                      + Assign Focus Area
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
        monthNumber={editingCurriculum?.monthNumber ?? assigningMonth ?? 1}
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
