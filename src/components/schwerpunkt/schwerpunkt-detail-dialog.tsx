'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, BookOpen, Target, Compass, Calendar } from 'lucide-react';
import { useLanguage } from '@/components/providers';

interface MonthTheme {
  id: string;
  titleDe: string;
  titleEn: string | null;
  descriptionDe: string | null;
  descriptionEn: string | null;
  herkunftDe: string | null;
  herkunftEn: string | null;
  zielDe: string | null;
  zielEn: string | null;
  imageUrl: string | null;
}

interface WeekTheme {
  id: string;
  weekNumber: string;
  titleDe: string;
  titleEn: string | null;
  descriptionDe: string | null;
  descriptionEn: string | null;
  herkunftDe: string | null;
  herkunftEn: string | null;
  zielDe: string | null;
  zielEn: string | null;
}

interface SchwerpunktDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthTheme: MonthTheme | null;
  weekTheme: WeekTheme | null;
  monthNumber: number;
  weekNumber: number;
}

export function SchwerpunktDetailDialog({
  open,
  onOpenChange,
  monthTheme,
  weekTheme,
  monthNumber,
  weekNumber,
}: SchwerpunktDetailDialogProps) {
  const { t, language } = useLanguage();

  if (!monthTheme) return null;

  const monthTitle = t(monthTheme.titleDe, monthTheme.titleEn);
  const monthDescription = t(monthTheme.descriptionDe, monthTheme.descriptionEn);
  const monthHerkunft = t(monthTheme.herkunftDe, monthTheme.herkunftEn);
  const monthZiel = t(monthTheme.zielDe, monthTheme.zielEn);

  const weekTitle = weekTheme ? t(weekTheme.titleDe, weekTheme.titleEn) : null;
  const weekDescription = weekTheme
    ? t(weekTheme.descriptionDe, weekTheme.descriptionEn)
    : null;
  const weekHerkunft = weekTheme ? t(weekTheme.herkunftDe, weekTheme.herkunftEn) : null;
  const weekZiel = weekTheme ? t(weekTheme.zielDe, weekTheme.zielEn) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto bg-gray-900 text-white sm:max-w-lg"
        data-testid="schwerpunkt-detail-dialog"
      >
        <DialogHeader>
          <DialogTitle
            className="flex items-center gap-2 text-xl"
            data-testid="schwerpunkt-dialog-title"
          >
            <BookOpen className="h-5 w-5 text-twilight-400" />
            {language === 'de' ? 'Schwerpunkt Details' : 'Focus Area Details'}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {language === 'de'
              ? `Monat ${monthNumber} - Woche ${weekNumber}`
              : `Month ${monthNumber} - Week ${weekNumber}`}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {/* Monthly Schwerpunktebene Section */}
          <section data-testid="monthly-schwerpunkt-section">
            <div className="mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-twilight-400" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-twilight-300">
                {language === 'de' ? 'Monatliches Schwerpunktthema' : 'Monthly Focus Theme'}
              </h3>
            </div>
            <div className="rounded-lg bg-gray-800 p-4">
              <h4
                className="text-lg font-bold text-white"
                data-testid="monthly-schwerpunkt-title"
              >
                {monthTitle}
              </h4>
              {monthDescription && (
                <p
                  className="mt-2 text-sm text-gray-300"
                  data-testid="monthly-schwerpunkt-description"
                >
                  {monthDescription}
                </p>
              )}

              {/* Herkunft (Background/Origin) */}
              {monthHerkunft && (
                <div className="mt-4" data-testid="monthly-herkunft-section">
                  <div className="mb-1 flex items-center gap-2">
                    <Compass className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-medium uppercase tracking-wide text-amber-400">
                      {language === 'de' ? 'Herkunft' : 'Background'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300" data-testid="monthly-herkunft-text">
                    {monthHerkunft}
                  </p>
                </div>
              )}

              {/* Ziel (Goal) */}
              {monthZiel && (
                <div className="mt-4" data-testid="monthly-ziel-section">
                  <div className="mb-1 flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-400" />
                    <span className="text-xs font-medium uppercase tracking-wide text-green-400">
                      {language === 'de' ? 'Ziel' : 'Goal'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300" data-testid="monthly-ziel-text">
                    {monthZiel}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Weekly Theme Section */}
          {weekTheme && (
            <section data-testid="weekly-theme-section">
              <div className="mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-twilight-400" />
                <h3 className="text-sm font-semibold uppercase tracking-wide text-twilight-300">
                  {language === 'de'
                    ? `Woche ${weekTheme.weekNumber} Thema`
                    : `Week ${weekTheme.weekNumber} Theme`}
                </h3>
              </div>
              <div className="rounded-lg bg-gray-800 p-4">
                <h4
                  className="text-lg font-bold text-white"
                  data-testid="weekly-theme-title"
                >
                  {weekTitle}
                </h4>
                {weekDescription && (
                  <p
                    className="mt-2 text-sm text-gray-300"
                    data-testid="weekly-theme-description"
                  >
                    {weekDescription}
                  </p>
                )}

                {/* Week Herkunft */}
                {weekHerkunft && (
                  <div className="mt-4" data-testid="weekly-herkunft-section">
                    <div className="mb-1 flex items-center gap-2">
                      <Compass className="h-4 w-4 text-amber-400" />
                      <span className="text-xs font-medium uppercase tracking-wide text-amber-400">
                        {language === 'de' ? 'Herkunft' : 'Background'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300" data-testid="weekly-herkunft-text">
                      {weekHerkunft}
                    </p>
                  </div>
                )}

                {/* Week Ziel */}
                {weekZiel && (
                  <div className="mt-4" data-testid="weekly-ziel-section">
                    <div className="mb-1 flex items-center gap-2">
                      <Target className="h-4 w-4 text-green-400" />
                      <span className="text-xs font-medium uppercase tracking-wide text-green-400">
                        {language === 'de' ? 'Ziel' : 'Goal'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300" data-testid="weekly-ziel-text">
                      {weekZiel}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        <div className="mt-6">
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-twilight-600 text-white hover:bg-twilight-500"
            data-testid="close-schwerpunkt-dialog-button"
          >
            <X className="mr-2 h-4 w-4" />
            {language === 'de' ? 'Schließen' : 'Close'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
