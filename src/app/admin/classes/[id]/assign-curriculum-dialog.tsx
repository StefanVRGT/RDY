'use client';

import { useState, useEffect } from 'react';
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

interface ExistingCurriculum {
  id: string;
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

interface AssignCurriculumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  monthNumber: number;
  existingCurriculum?: ExistingCurriculum | null;
  onSuccess: () => void;
}

export function AssignCurriculumDialog({
  open,
  onOpenChange,
  classId,
  monthNumber,
  existingCurriculum,
  onSuccess,
}: AssignCurriculumDialogProps) {
  const [schwerpunktebeneId, setSchwerpunktebeneId] = useState('');
  const [customTitleDe, setCustomTitleDe] = useState('');
  const [customTitleEn, setCustomTitleEn] = useState('');
  const [customDescriptionDe, setCustomDescriptionDe] = useState('');
  const [customDescriptionEn, setCustomDescriptionEn] = useState('');
  const [mentorNotes, setMentorNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: schwerpunktebenen } = trpc.classes.getAvailableSchwerpunktebenen.useQuery(
    undefined,
    { enabled: open }
  );

  const assignMutation = trpc.classes.assignCurriculum.useMutation({
    onSuccess: () => {
      resetForm();
      onSuccess();
    },
    onError: (error) => {
      setErrorMessage(error.message);
    },
  });

  useEffect(() => {
    if (existingCurriculum) {
      setSchwerpunktebeneId(existingCurriculum.schwerpunktebeneId);
      setCustomTitleDe(existingCurriculum.customTitleDe || '');
      setCustomTitleEn(existingCurriculum.customTitleEn || '');
      setCustomDescriptionDe(existingCurriculum.customDescriptionDe || '');
      setCustomDescriptionEn(existingCurriculum.customDescriptionEn || '');
      setMentorNotes(existingCurriculum.mentorNotes || '');
    } else {
      resetForm();
    }
  }, [existingCurriculum, open]);

  const resetForm = () => {
    setSchwerpunktebeneId('');
    setCustomTitleDe('');
    setCustomTitleEn('');
    setCustomDescriptionDe('');
    setCustomDescriptionEn('');
    setMentorNotes('');
    setErrorMessage(null);
  };

  const handleSubmit = async () => {
    if (!schwerpunktebeneId) {
      setErrorMessage('Please select a focus area');
      return;
    }

    setErrorMessage(null);
    await assignMutation.mutateAsync({
      classId,
      schwerpunktebeneId,
      monthNumber,
      customTitleDe: customTitleDe.trim() || null,
      customTitleEn: customTitleEn.trim() || null,
      customDescriptionDe: customDescriptionDe.trim() || null,
      customDescriptionEn: customDescriptionEn.trim() || null,
      mentorNotes: mentorNotes.trim() || null,
    });
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const selectedSchwerpunktebene = schwerpunktebenen?.find(
    (s) => s.id === schwerpunktebeneId
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-gray-800 bg-gray-900 text-white sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {existingCurriculum ? 'Edit' : 'Assign'} Curriculum - Month {monthNumber}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Select a focus area and optionally customize it for this class
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Focus Area Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Focus Area *</label>
            <Select value={schwerpunktebeneId} onValueChange={setSchwerpunktebeneId}>
              <SelectTrigger className="w-full border-gray-700 bg-gray-800 text-white">
                <SelectValue placeholder="Select a focus area" />
              </SelectTrigger>
              <SelectContent className="border-gray-700 bg-gray-800">
                {schwerpunktebenen?.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-white">
                    {s.titleDe} {s.monthNumber ? `(Month ${s.monthNumber})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Show selected focus area description */}
          {selectedSchwerpunktebene && (
            <div className="rounded-lg bg-gray-800 p-3">
              <p className="text-sm font-medium text-white">{selectedSchwerpunktebene.titleDe}</p>
              {selectedSchwerpunktebene.titleEn && (
                <p className="text-sm text-gray-400">{selectedSchwerpunktebene.titleEn}</p>
              )}
            </div>
          )}

          {/* Customization Section */}
          <div className="space-y-4 rounded-lg border border-gray-700 p-4">
            <p className="text-sm font-medium text-gray-300">
              Optional Customization (overrides default)
            </p>

            {/* Custom Title (DE) */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Custom Title (German)</label>
              <Input
                placeholder="Leave empty to use default"
                value={customTitleDe}
                onChange={(e) => setCustomTitleDe(e.target.value)}
                className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
              />
            </div>

            {/* Custom Title (EN) */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Custom Title (English)</label>
              <Input
                placeholder="Leave empty to use default"
                value={customTitleEn}
                onChange={(e) => setCustomTitleEn(e.target.value)}
                className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
              />
            </div>

            {/* Custom Description (DE) */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Custom Description (German)</label>
              <textarea
                placeholder="Leave empty to use default"
                value={customDescriptionDe}
                onChange={(e) => setCustomDescriptionDe(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Custom Description (EN) */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Custom Description (English)</label>
              <textarea
                placeholder="Leave empty to use default"
                value={customDescriptionEn}
                onChange={(e) => setCustomDescriptionEn(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Mentor Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Mentor Notes</label>
            <textarea
              placeholder="Private notes for the mentor (not visible to students)"
              value={mentorNotes}
              onChange={(e) => setMentorNotes(e.target.value)}
              rows={3}
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
          <Button onClick={handleSubmit} disabled={!schwerpunktebeneId || assignMutation.isPending}>
            {assignMutation.isPending
              ? 'Saving...'
              : existingCurriculum
                ? 'Update Assignment'
                : 'Assign Focus Area'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
