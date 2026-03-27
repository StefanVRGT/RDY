'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Week {
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
  measurementType: 'scale_1_10' | 'yes_no' | 'frequency' | 'percentage' | 'custom' | null;
  measurementQuestionDe: string | null;
  measurementQuestionEn: string | null;
}

interface EditWeekDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  week: Week | null;
  onSuccess: () => void;
}

type MeasurementType = 'scale_1_10' | 'yes_no' | 'frequency' | 'percentage' | 'custom';

export function EditWeekDialog({ open, onOpenChange, week, onSuccess }: EditWeekDialogProps) {
  const [weekNumber, setWeekNumber] = useState('1');
  const [titleDe, setTitleDe] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [descriptionDe, setDescriptionDe] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [herkunftDe, setHerkunftDe] = useState('');
  const [herkunftEn, setHerkunftEn] = useState('');
  const [zielDe, setZielDe] = useState('');
  const [zielEn, setZielEn] = useState('');
  const [measurementType, setMeasurementType] = useState<MeasurementType>('scale_1_10');
  const [measurementQuestionDe, setMeasurementQuestionDe] = useState('');
  const [measurementQuestionEn, setMeasurementQuestionEn] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (week) {
      setWeekNumber(week.weekNumber);
      setTitleDe(week.titleDe);
      setTitleEn(week.titleEn || '');
      setDescriptionDe(week.descriptionDe || '');
      setDescriptionEn(week.descriptionEn || '');
      setHerkunftDe(week.herkunftDe || '');
      setHerkunftEn(week.herkunftEn || '');
      setZielDe(week.zielDe || '');
      setZielEn(week.zielEn || '');
      setMeasurementType(week.measurementType || 'scale_1_10');
      setMeasurementQuestionDe(week.measurementQuestionDe || '');
      setMeasurementQuestionEn(week.measurementQuestionEn || '');
      setErrorMessage(null);
    }
  }, [week]);

  const updateMutation = trpc.weeks.update.useMutation({
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      setErrorMessage(error.message);
    },
  });

  const handleSubmit = async () => {
    if (!week) return;
    if (!titleDe.trim()) {
      setErrorMessage('German title is required');
      return;
    }

    setErrorMessage(null);
    await updateMutation.mutateAsync({
      id: week.id,
      weekNumber: weekNumber,
      titleDe: titleDe.trim(),
      titleEn: titleEn.trim() || null,
      descriptionDe: descriptionDe.trim() || null,
      descriptionEn: descriptionEn.trim() || null,
      herkunftDe: herkunftDe.trim() || null,
      herkunftEn: herkunftEn.trim() || null,
      zielDe: zielDe.trim() || null,
      zielEn: zielEn.trim() || null,
      measurementType,
      measurementQuestionDe: measurementQuestionDe.trim() || null,
      measurementQuestionEn: measurementQuestionEn.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Week</DialogTitle>
          <DialogDescription>
            Update the week details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Week Number */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Week Number</label>
            <Select value={weekNumber} onValueChange={setWeekNumber}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select week" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">
                  Week 1
                </SelectItem>
                <SelectItem value="2">
                  Week 2
                </SelectItem>
                <SelectItem value="3">
                  Week 3
                </SelectItem>
                <SelectItem value="4">
                  Week 4
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title (DE) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Title (German) *</label>
            <Input
              placeholder="Titel auf Deutsch"
              value={titleDe}
              onChange={(e) => setTitleDe(e.target.value)}
            />
          </div>

          {/* Title (EN) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Title (English)</label>
            <Input
              placeholder="Title in English"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
            />
          </div>

          {/* Description (DE) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Description (German)</label>
            <textarea
              placeholder="Beschreibung auf Deutsch"
              value={descriptionDe}
              onChange={(e) => setDescriptionDe(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-rdy-gray-200 bg-white px-3 py-2 placeholder:text-rdy-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rdy-orange-500"
            />
          </div>

          {/* Description (EN) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Description (English)</label>
            <textarea
              placeholder="Description in English"
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-rdy-gray-200 bg-white px-3 py-2 placeholder:text-rdy-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rdy-orange-500"
            />
          </div>

          {/* Herkunft (DE) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Origin/Herkunft (German)</label>
            <textarea
              placeholder="Herkunft auf Deutsch"
              value={herkunftDe}
              onChange={(e) => setHerkunftDe(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-rdy-gray-200 bg-white px-3 py-2 placeholder:text-rdy-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rdy-orange-500"
            />
          </div>

          {/* Herkunft (EN) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Origin/Herkunft (English)</label>
            <textarea
              placeholder="Origin in English"
              value={herkunftEn}
              onChange={(e) => setHerkunftEn(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-rdy-gray-200 bg-white px-3 py-2 placeholder:text-rdy-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rdy-orange-500"
            />
          </div>

          {/* Ziel (DE) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Goal/Ziel (German)</label>
            <textarea
              placeholder="Ziel auf Deutsch"
              value={zielDe}
              onChange={(e) => setZielDe(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-rdy-gray-200 bg-white px-3 py-2 placeholder:text-rdy-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rdy-orange-500"
            />
          </div>

          {/* Ziel (EN) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Goal/Ziel (English)</label>
            <textarea
              placeholder="Goal in English"
              value={zielEn}
              onChange={(e) => setZielEn(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-rdy-gray-200 bg-white px-3 py-2 placeholder:text-rdy-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rdy-orange-500"
            />
          </div>

          {/* Measurement Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Measurement Type</label>
            <Select
              value={measurementType}
              onValueChange={(value: MeasurementType) => setMeasurementType(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select measurement type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scale_1_10">
                  Scale 1-10
                </SelectItem>
                <SelectItem value="yes_no">
                  Yes/No
                </SelectItem>
                <SelectItem value="frequency">
                  Frequency
                </SelectItem>
                <SelectItem value="percentage">
                  Percentage
                </SelectItem>
                <SelectItem value="custom">
                  Custom
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Measurement Question (DE) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">
              Measurement Question (German)
            </label>
            <textarea
              placeholder="Wie bewerten Sie...?"
              value={measurementQuestionDe}
              onChange={(e) => setMeasurementQuestionDe(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-rdy-gray-200 bg-white px-3 py-2 placeholder:text-rdy-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rdy-orange-500"
            />
          </div>

          {/* Measurement Question (EN) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">
              Measurement Question (English)
            </label>
            <textarea
              placeholder="How would you rate...?"
              value={measurementQuestionEn}
              onChange={(e) => setMeasurementQuestionEn(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-rdy-gray-200 bg-white px-3 py-2 placeholder:text-rdy-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rdy-orange-500"
            />
          </div>

          {errorMessage && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-500">{errorMessage}</div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-rdy-gray-200 text-rdy-gray-600 hover:bg-rdy-gray-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!titleDe.trim() || updateMutation.isPending}
            className="bg-rdy-orange-500 text-white hover:bg-rdy-orange-600"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
