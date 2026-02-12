'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

interface Schwerpunktebene {
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
}

interface PreviewModeProps {
  curriculum: Schwerpunktebene[];
}

type ViewMode = 'timeline' | 'list' | 'calendar';
type Language = 'de' | 'en';

export function PreviewMode({ curriculum }: PreviewModeProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [language, setLanguage] = useState<Language>('de');
  const [showOnlyObligatory, setShowOnlyObligatory] = useState(false);

  const getTitle = (de: string, en: string | null) => {
    if (language === 'en' && en) return en;
    return de;
  };

  const getDescription = (de: string | null, en: string | null) => {
    if (language === 'en' && en) return en;
    return de;
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

  const getMonthName = (monthNumber: string) => {
    const monthNames = language === 'de'
      ? ['Monat 1', 'Monat 2', 'Monat 3']
      : ['Month 1', 'Month 2', 'Month 3'];
    return monthNames[parseInt(monthNumber) - 1] || monthNumber;
  };

  const getTotalStats = () => {
    let totalWeeks = 0;
    let totalExercises = 0;
    let obligatoryExercises = 0;
    let optionalExercises = 0;
    let totalDuration = 0;

    curriculum.forEach((s) => {
      totalWeeks += s.weeks.length;
      s.weeks.forEach((w) => {
        w.exercises.forEach((e) => {
          totalExercises++;
          if (e.isObligatory) {
            obligatoryExercises++;
          } else {
            optionalExercises++;
          }
          if (e.exercise.durationMinutes) {
            totalDuration += e.exercise.durationMinutes;
          }
        });
      });
    });

    return { totalWeeks, totalExercises, obligatoryExercises, optionalExercises, totalDuration };
  };

  const stats = getTotalStats();

  if (curriculum.length === 0) {
    return (
      <div className="rounded-lg border border-rdy-gray-200 bg-rdy-gray-100 p-8 text-center">
        <p className="text-rdy-gray-400">
          {language === 'de'
            ? 'Keine Curriculumdaten zum Anzeigen vorhanden.'
            : 'No curriculum data available to preview.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Preview Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-rdy-gray-200 bg-rdy-gray-100 p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-rdy-gray-400">
              {language === 'de' ? 'Ansicht:' : 'View:'}
            </span>
            <div className="flex rounded-lg border border-rdy-gray-200">
              <Button
                variant={viewMode === 'timeline' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('timeline')}
                className="rounded-r-none"
              >
                {language === 'de' ? 'Zeitstrahl' : 'Timeline'}
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none border-x border-rdy-gray-200"
              >
                {language === 'de' ? 'Liste' : 'List'}
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                className="rounded-l-none"
              >
                {language === 'de' ? 'Kalender' : 'Calendar'}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-rdy-gray-400">
              {language === 'de' ? 'Sprache:' : 'Language:'}
            </span>
            <div className="flex rounded-lg border border-rdy-gray-200">
              <Button
                variant={language === 'de' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setLanguage('de')}
                className="rounded-r-none"
              >
                DE
              </Button>
              <Button
                variant={language === 'en' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setLanguage('en')}
                className="rounded-l-none"
              >
                EN
              </Button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-rdy-gray-400">
            <input
              type="checkbox"
              checked={showOnlyObligatory}
              onChange={(e) => setShowOnlyObligatory(e.target.checked)}
              className="rounded border-rdy-gray-200 bg-rdy-gray-100"
            />
            {language === 'de' ? 'Nur Pflichtübungen' : 'Obligatory only'}
          </label>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-rdy-gray-200 bg-rdy-gray-100">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-rdy-black">{curriculum.length}</div>
            <div className="text-sm text-rdy-gray-400">
              {language === 'de' ? 'Schwerpunktebenen' : 'Focus Areas'}
            </div>
          </CardContent>
        </Card>
        <Card className="border-rdy-gray-200 bg-rdy-gray-100">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-rdy-black">{stats.totalWeeks}</div>
            <div className="text-sm text-rdy-gray-400">
              {language === 'de' ? 'Wochen' : 'Weeks'}
            </div>
          </CardContent>
        </Card>
        <Card className="border-rdy-gray-200 bg-rdy-gray-100">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-rdy-black">{stats.totalExercises}</div>
            <div className="text-sm text-rdy-gray-400">
              {language === 'de' ? 'Übungen' : 'Exercises'}
            </div>
          </CardContent>
        </Card>
        <Card className="border-rdy-gray-200 bg-rdy-gray-100">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-rdy-orange-500">{stats.obligatoryExercises}</div>
            <div className="text-sm text-rdy-gray-400">
              {language === 'de' ? 'Pflicht' : 'Obligatory'}
            </div>
          </CardContent>
        </Card>
        <Card className="border-rdy-gray-200 bg-rdy-gray-100">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-rdy-black">
              {Math.round(stats.totalDuration / 60)}h {stats.totalDuration % 60}m
            </div>
            <div className="text-sm text-rdy-gray-400">
              {language === 'de' ? 'Gesamtdauer' : 'Total Duration'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Content based on View Mode */}
      {viewMode === 'timeline' && (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-8 top-0 h-full w-0.5 bg-rdy-gray-200" />

          <div className="space-y-8">
            {curriculum.map((schwerpunktebene) => (
              <div key={schwerpunktebene.id} className="relative">
                {/* Month marker */}
                <div className="absolute left-0 flex h-16 w-16 items-center justify-center rounded-full bg-rdy-gray-100 text-center">
                  <div>
                    <div className="text-xs text-rdy-gray-400">
                      {language === 'de' ? 'Monat' : 'Month'}
                    </div>
                    <div className="text-xl font-bold text-rdy-black">{schwerpunktebene.monthNumber}</div>
                  </div>
                </div>

                <div className="ml-24">
                  <Card className="border-rdy-gray-200 bg-rdy-gray-100">
                    <CardHeader>
                      <CardTitle className="text-rdy-black">
                        {getTitle(schwerpunktebene.titleDe, schwerpunktebene.titleEn)}
                      </CardTitle>
                      {(schwerpunktebene.descriptionDe || schwerpunktebene.descriptionEn) && (
                        <p className="text-sm text-rdy-gray-400">
                          {getDescription(
                            schwerpunktebene.descriptionDe,
                            schwerpunktebene.descriptionEn
                          )}
                        </p>
                      )}
                      {(schwerpunktebene.zielDe || schwerpunktebene.zielEn) && (
                        <p className="text-sm text-green-400">
                          {language === 'de' ? 'Ziel: ' : 'Goal: '}
                          {getDescription(schwerpunktebene.zielDe, schwerpunktebene.zielEn)}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {schwerpunktebene.weeks.map((week) => (
                        <div key={week.id} className="rounded-lg border border-rdy-gray-200 bg-rdy-gray-100 p-4">
                          <div className="mb-3 flex items-center gap-3">
                            <span className="inline-flex items-center rounded-full bg-rdy-orange-500/10 px-2 py-1 text-xs font-medium text-rdy-orange-500">
                              {language === 'de' ? 'Woche' : 'Week'} {week.weekNumber}
                            </span>
                            <span className="font-medium text-rdy-black">
                              {getTitle(week.titleDe, week.titleEn)}
                            </span>
                          </div>

                          {(week.zielDe || week.zielEn) && (
                            <p className="mb-3 text-sm text-rdy-gray-400">
                              {language === 'de' ? 'Ziel: ' : 'Goal: '}
                              {getDescription(week.zielDe, week.zielEn)}
                            </p>
                          )}

                          {/* Exercises */}
                          <div className="space-y-2">
                            {week.exercises
                              .filter((e) => !showOnlyObligatory || e.isObligatory)
                              .map((we) => (
                                <div
                                  key={we.id}
                                  className={`flex items-center justify-between rounded border p-2 ${
                                    we.isObligatory
                                      ? 'border-orange-800/50 bg-orange-900/10'
                                      : 'border-rdy-gray-200 bg-rdy-gray-200/30'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="text-lg">
                                      {getExerciseTypeIcon(we.exercise.type)}
                                    </span>
                                    <span className="text-sm text-rdy-black">
                                      {getTitle(we.exercise.titleDe, we.exercise.titleEn)}
                                    </span>
                                    {we.exercise.durationMinutes && (
                                      <span className="text-xs text-rdy-gray-500">
                                        ({we.exercise.durationMinutes}{' '}
                                        {language === 'de' ? 'Min.' : 'min'})
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {we.isObligatory && (
                                      <span className="text-xs text-rdy-orange-500">
                                        {language === 'de' ? 'Pflicht' : 'Required'}
                                      </span>
                                    )}
                                    <span className="text-xs text-rdy-gray-500">{we.frequency}</span>
                                  </div>
                                </div>
                              ))}

                            {week.exercises.filter((e) => !showOnlyObligatory || e.isObligatory)
                              .length === 0 && (
                              <p className="text-center text-sm text-rdy-gray-500">
                                {language === 'de'
                                  ? 'Keine Übungen in dieser Woche.'
                                  : 'No exercises in this week.'}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}

                      {schwerpunktebene.weeks.length === 0 && (
                        <p className="text-center text-sm text-rdy-gray-500">
                          {language === 'de'
                            ? 'Keine Wochen in diesem Schwerpunkt.'
                            : 'No weeks in this focus area.'}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'list' && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-rdy-gray-200 text-left text-sm text-rdy-gray-400">
                <th className="p-3">{language === 'de' ? 'Monat' : 'Month'}</th>
                <th className="p-3">{language === 'de' ? 'Woche' : 'Week'}</th>
                <th className="p-3">{language === 'de' ? 'Übung' : 'Exercise'}</th>
                <th className="p-3">{language === 'de' ? 'Typ' : 'Type'}</th>
                <th className="p-3">{language === 'de' ? 'Dauer' : 'Duration'}</th>
                <th className="p-3">{language === 'de' ? 'Status' : 'Status'}</th>
                <th className="p-3">{language === 'de' ? 'Frequenz' : 'Frequency'}</th>
              </tr>
            </thead>
            <tbody>
              {curriculum.flatMap((s) =>
                s.weeks.flatMap((w) =>
                  w.exercises
                    .filter((e) => !showOnlyObligatory || e.isObligatory)
                    .map((e) => (
                      <tr key={e.id} className="border-b border-rdy-gray-200 hover:bg-rdy-gray-200/50">
                        <td className="p-3 text-rdy-black">
                          {getMonthName(s.monthNumber)}: {getTitle(s.titleDe, s.titleEn)}
                        </td>
                        <td className="p-3 text-rdy-black">
                          W{w.weekNumber}: {getTitle(w.titleDe, w.titleEn)}
                        </td>
                        <td className="p-3 text-rdy-black">
                          {getExerciseTypeIcon(e.exercise.type)}{' '}
                          {getTitle(e.exercise.titleDe, e.exercise.titleEn)}
                        </td>
                        <td className="p-3 capitalize text-rdy-gray-400">{e.exercise.type}</td>
                        <td className="p-3 text-rdy-gray-400">
                          {e.exercise.durationMinutes
                            ? `${e.exercise.durationMinutes} ${language === 'de' ? 'Min.' : 'min'}`
                            : '-'}
                        </td>
                        <td className="p-3">
                          <span
                            className={
                              e.isObligatory ? 'text-rdy-orange-500' : 'text-rdy-gray-500'
                            }
                          >
                            {e.isObligatory
                              ? language === 'de'
                                ? 'Pflicht'
                                : 'Required'
                              : language === 'de'
                                ? 'Optional'
                                : 'Optional'}
                          </span>
                        </td>
                        <td className="p-3 capitalize text-rdy-gray-400">{e.frequency}</td>
                      </tr>
                    ))
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'calendar' && (
        <div className="grid gap-4 md:grid-cols-3">
          {curriculum.map((s) => (
            <Card key={s.id} className="border-rdy-gray-200 bg-rdy-gray-100">
              <CardHeader className="pb-2">
                <div className="text-sm text-rdy-gray-500">{getMonthName(s.monthNumber)}</div>
                <CardTitle className="text-lg text-rdy-black">
                  {getTitle(s.titleDe, s.titleEn)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {s.weeks.map((w) => {
                    const obligatoryCount = w.exercises.filter((e) => e.isObligatory).length;
                    const optionalCount = w.exercises.filter((e) => !e.isObligatory).length;
                    const totalDuration = w.exercises.reduce(
                      (sum, e) => sum + (e.exercise.durationMinutes || 0),
                      0
                    );

                    return (
                      <div key={w.id} className="rounded border border-rdy-gray-200 bg-rdy-gray-100 p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-rdy-black">
                            {language === 'de' ? 'Woche' : 'Week'} {w.weekNumber}
                          </span>
                          <span className="text-xs text-rdy-gray-500">
                            {totalDuration > 0 && `${totalDuration} ${language === 'de' ? 'Min.' : 'min'}`}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-rdy-gray-400">
                          {getTitle(w.titleDe, w.titleEn)}
                        </div>
                        <div className="mt-2 flex gap-3 text-xs">
                          {obligatoryCount > 0 && (
                            <span className="text-rdy-orange-500">
                              {obligatoryCount} {language === 'de' ? 'Pflicht' : 'required'}
                            </span>
                          )}
                          {optionalCount > 0 && !showOnlyObligatory && (
                            <span className="text-rdy-gray-500">
                              {optionalCount} {language === 'de' ? 'optional' : 'optional'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {s.weeks.length === 0 && (
                    <p className="text-center text-sm text-rdy-gray-500">
                      {language === 'de' ? 'Keine Wochen' : 'No weeks'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
