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

interface Level {
  id: string;
  levelNumber: string;
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

interface EditLevelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level: Level | null;
  onSuccess: () => void;
}

export function EditLevelDialog({
  open,
  onOpenChange,
  level,
  onSuccess,
}: EditLevelDialogProps) {
  const [levelNumber, setLevelNumber] = useState<'1' | '2' | '3' | '4' | '5'>('1');
  const [titleDe, setTitleDe] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [descriptionDe, setDescriptionDe] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [herkunftDe, setHerkunftDe] = useState('');
  const [herkunftEn, setHerkunftEn] = useState('');
  const [zielDe, setZielDe] = useState('');
  const [zielEn, setZielEn] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Populate form when level changes
  useEffect(() => {
    if (level) {
      setLevelNumber(level.levelNumber as '1' | '2' | '3' | '4' | '5');
      setTitleDe(level.titleDe);
      setTitleEn(level.titleEn || '');
      setDescriptionDe(level.descriptionDe || '');
      setDescriptionEn(level.descriptionEn || '');
      setHerkunftDe(level.herkunftDe || '');
      setHerkunftEn(level.herkunftEn || '');
      setZielDe(level.zielDe || '');
      setZielEn(level.zielEn || '');
      setImageUrl(level.imageUrl || '');
      setErrorMessage(null);
    }
  }, [level]);

  const updateMutation = trpc.schwerpunktebenen.update.useMutation({
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      setErrorMessage(error.message);
    },
  });

  const handleSubmit = async () => {
    if (!level) return;

    if (!titleDe.trim()) {
      setErrorMessage('German title is required');
      return;
    }

    setErrorMessage(null);
    await updateMutation.mutateAsync({
      id: level.id,
      levelNumber,
      titleDe: titleDe.trim(),
      titleEn: titleEn.trim() || null,
      descriptionDe: descriptionDe.trim() || null,
      descriptionEn: descriptionEn.trim() || null,
      herkunftDe: herkunftDe.trim() || null,
      herkunftEn: herkunftEn.trim() || null,
      zielDe: zielDe.trim() || null,
      zielEn: zielEn.trim() || null,
      imageUrl: imageUrl.trim() || null,
    });
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setErrorMessage(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Modul bearbeiten</DialogTitle>
          <DialogDescription>
            Modul-Details aktualisieren
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Level Number */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Modul Number</label>
            <Select
              value={levelNumber}
              onValueChange={(value: '1' | '2' | '3' | '4' | '5') => setLevelNumber(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Modul" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">
                  Modul 1
                </SelectItem>
                <SelectItem value="2">
                  Modul 2
                </SelectItem>
                <SelectItem value="3">
                  Modul 3
                </SelectItem>
                <SelectItem value="4">
                  Modul 4
                </SelectItem>
                <SelectItem value="5">
                  Modul 5
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

          {/* Image URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Image URL</label>
            <Input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
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
