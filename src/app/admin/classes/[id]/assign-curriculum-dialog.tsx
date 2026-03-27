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

interface ExistingCurriculum {
  id: string;
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

interface AssignCurriculumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  levelNumber: number;
  existingCurriculum?: ExistingCurriculum | null;
  onSuccess: () => void;
}

export function AssignCurriculumDialog({
  open,
  onOpenChange,
  classId,
  levelNumber,
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
      setErrorMessage('Please select a Modul');
      return;
    }

    setErrorMessage(null);
    await assignMutation.mutateAsync({
      classId,
      schwerpunktebeneId,
      levelNumber,
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {existingCurriculum ? 'Edit' : 'Assign'} Modul {levelNumber}
          </DialogTitle>
          <DialogDescription>
            Select a Modul and optionally customize it for this class
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Focus Area Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Modul *</label>
            <Select value={schwerpunktebeneId} onValueChange={setSchwerpunktebeneId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a Modul" />
              </SelectTrigger>
              <SelectContent>
                {schwerpunktebenen?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.titleDe} {s.levelNumber ? `(Modul ${s.levelNumber})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Show selected focus area description */}
          {selectedSchwerpunktebene && (
            <div className="rounded-lg bg-rdy-gray-100 p-3">
              <p className="text-sm font-medium">{selectedSchwerpunktebene.titleDe}</p>
              {selectedSchwerpunktebene.titleEn && (
                <p className="text-sm text-rdy-gray-400">{selectedSchwerpunktebene.titleEn}</p>
              )}
            </div>
          )}

          {/* Customization Section */}
          <div className="space-y-4 rounded-lg border border-rdy-gray-200 p-4">
            <p className="text-sm font-medium text-rdy-gray-600">
              Optional Customization (overrides default)
            </p>

            {/* Custom Title (DE) */}
            <div className="space-y-2">
              <label className="text-sm text-rdy-gray-400">Custom Title (German)</label>
              <Input
                placeholder="Leave empty to use default"
                value={customTitleDe}
                onChange={(e) => setCustomTitleDe(e.target.value)}
              />
            </div>

            {/* Custom Title (EN) */}
            <div className="space-y-2">
              <label className="text-sm text-rdy-gray-400">Custom Title (English)</label>
              <Input
                placeholder="Leave empty to use default"
                value={customTitleEn}
                onChange={(e) => setCustomTitleEn(e.target.value)}
              />
            </div>

            {/* Custom Description (DE) */}
            <div className="space-y-2">
              <label className="text-sm text-rdy-gray-400">Custom Description (German)</label>
              <textarea
                placeholder="Leave empty to use default"
                value={customDescriptionDe}
                onChange={(e) => setCustomDescriptionDe(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-rdy-gray-200 bg-white px-3 py-2 placeholder:text-rdy-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rdy-orange-500"
              />
            </div>

            {/* Custom Description (EN) */}
            <div className="space-y-2">
              <label className="text-sm text-rdy-gray-400">Custom Description (English)</label>
              <textarea
                placeholder="Leave empty to use default"
                value={customDescriptionEn}
                onChange={(e) => setCustomDescriptionEn(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-rdy-gray-200 bg-white px-3 py-2 placeholder:text-rdy-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rdy-orange-500"
              />
            </div>
          </div>

          {/* Mentor Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Mentor Notes</label>
            <textarea
              placeholder="Private notes for the mentor (not visible to students)"
              value={mentorNotes}
              onChange={(e) => setMentorNotes(e.target.value)}
              rows={3}
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
            onClick={() => handleClose(false)}
            className="border-rdy-gray-200 text-rdy-gray-600 hover:bg-rdy-gray-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!schwerpunktebeneId || assignMutation.isPending}
            className="bg-rdy-orange-500 text-white hover:bg-rdy-orange-600"
          >
            {assignMutation.isPending
              ? 'Saving...'
              : existingCurriculum
                ? 'Update Assignment'
                : 'Modul zuweisen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
