'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
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

interface CreateWeekDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schwerpunktebeneId: string;
  onSuccess: () => void;
}

type MeasurementType = 'scale_1_10' | 'yes_no' | 'frequency' | 'percentage' | 'custom';

export function CreateWeekDialog({
  open,
  onOpenChange,
  schwerpunktebeneId,
  onSuccess,
}: CreateWeekDialogProps) {
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

  const createMutation = trpc.weeks.create.useMutation({
    onSuccess: () => {
      resetForm();
      onSuccess();
    },
    onError: (error) => {
      setErrorMessage(error.message);
    },
  });

  const resetForm = () => {
    setWeekNumber('1');
    setTitleDe('');
    setTitleEn('');
    setDescriptionDe('');
    setDescriptionEn('');
    setHerkunftDe('');
    setHerkunftEn('');
    setZielDe('');
    setZielEn('');
    setMeasurementType('scale_1_10');
    setMeasurementQuestionDe('');
    setMeasurementQuestionEn('');
    setErrorMessage(null);
  };

  const handleSubmit = async () => {
    if (!titleDe.trim()) {
      setErrorMessage('German title is required');
      return;
    }

    setErrorMessage(null);
    await createMutation.mutateAsync({
      schwerpunktebeneId,
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

  const handleClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-gray-800 bg-gray-900 text-white sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Week</DialogTitle>
          <DialogDescription className="text-gray-400">
            Add a new week to the focus area
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Week Number */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Week Number</label>
            <Select value={weekNumber} onValueChange={setWeekNumber}>
              <SelectTrigger className="w-full border-gray-700 bg-gray-800 text-white">
                <SelectValue placeholder="Select week" />
              </SelectTrigger>
              <SelectContent className="border-gray-700 bg-gray-800">
                <SelectItem value="1" className="text-white">
                  Week 1
                </SelectItem>
                <SelectItem value="2" className="text-white">
                  Week 2
                </SelectItem>
                <SelectItem value="3" className="text-white">
                  Week 3
                </SelectItem>
                <SelectItem value="4" className="text-white">
                  Week 4
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title (DE) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Title (German) *</label>
            <Input
              placeholder="Titel auf Deutsch"
              value={titleDe}
              onChange={(e) => setTitleDe(e.target.value)}
              className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
            />
          </div>

          {/* Title (EN) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Title (English)</label>
            <Input
              placeholder="Title in English"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
            />
          </div>

          {/* Description (DE) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Description (German)</label>
            <textarea
              placeholder="Beschreibung auf Deutsch"
              value={descriptionDe}
              onChange={(e) => setDescriptionDe(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description (EN) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Description (English)</label>
            <textarea
              placeholder="Description in English"
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Herkunft (DE) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Origin/Herkunft (German)</label>
            <textarea
              placeholder="Herkunft auf Deutsch"
              value={herkunftDe}
              onChange={(e) => setHerkunftDe(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Herkunft (EN) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Origin/Herkunft (English)</label>
            <textarea
              placeholder="Origin in English"
              value={herkunftEn}
              onChange={(e) => setHerkunftEn(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Ziel (DE) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Goal/Ziel (German)</label>
            <textarea
              placeholder="Ziel auf Deutsch"
              value={zielDe}
              onChange={(e) => setZielDe(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Ziel (EN) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Goal/Ziel (English)</label>
            <textarea
              placeholder="Goal in English"
              value={zielEn}
              onChange={(e) => setZielEn(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Measurement Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Measurement Type</label>
            <Select
              value={measurementType}
              onValueChange={(value: MeasurementType) => setMeasurementType(value)}
            >
              <SelectTrigger className="w-full border-gray-700 bg-gray-800 text-white">
                <SelectValue placeholder="Select measurement type" />
              </SelectTrigger>
              <SelectContent className="border-gray-700 bg-gray-800">
                <SelectItem value="scale_1_10" className="text-white">
                  Scale 1-10
                </SelectItem>
                <SelectItem value="yes_no" className="text-white">
                  Yes/No
                </SelectItem>
                <SelectItem value="frequency" className="text-white">
                  Frequency
                </SelectItem>
                <SelectItem value="percentage" className="text-white">
                  Percentage
                </SelectItem>
                <SelectItem value="custom" className="text-white">
                  Custom
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Measurement Question (DE) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Measurement Question (German)
            </label>
            <textarea
              placeholder="Wie bewerten Sie...?"
              value={measurementQuestionDe}
              onChange={(e) => setMeasurementQuestionDe(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Measurement Question (EN) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Measurement Question (English)
            </label>
            <textarea
              placeholder="How would you rate...?"
              value={measurementQuestionEn}
              onChange={(e) => setMeasurementQuestionEn(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {errorMessage && (
            <div className="rounded-lg bg-red-900/20 p-3 text-sm text-red-400">{errorMessage}</div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!titleDe.trim() || createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Week'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
