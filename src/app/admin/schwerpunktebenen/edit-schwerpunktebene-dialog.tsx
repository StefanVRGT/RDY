'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileDropZone } from '@/components/ui/file-dropzone';
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

interface TrackingCategory {
  key: string;
  label: string;
  emoji: string;
}

interface Schwerpunktebene {
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
  trackingCategories?: TrackingCategory[] | null;
}

interface EditSchwerpunktebeneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schwerpunktebene: Schwerpunktebene | null;
  onSuccess: () => void;
}

export function EditSchwerpunktebeneDialog({
  open,
  onOpenChange,
  schwerpunktebene,
  onSuccess,
}: EditSchwerpunktebeneDialogProps) {
  const [levelNumber, setMonthNumber] = useState<'1' | '2' | '3'>('1');
  const [titleDe, setTitleDe] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [descriptionDe, setDescriptionDe] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [herkunftDe, setHerkunftDe] = useState('');
  const [herkunftEn, setHerkunftEn] = useState('');
  const [zielDe, setZielDe] = useState('');
  const [zielEn, setZielEn] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [trackingCategories, setTrackingCategories] = useState<TrackingCategory[]>([]);
  const [exerciseDays, setExerciseDays] = useState(20);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Populate form when schwerpunktebene changes
  useEffect(() => {
    if (schwerpunktebene) {
      setMonthNumber(schwerpunktebene.levelNumber as '1' | '2' | '3');
      setTitleDe(schwerpunktebene.titleDe);
      setTitleEn(schwerpunktebene.titleEn || '');
      setDescriptionDe(schwerpunktebene.descriptionDe || '');
      setDescriptionEn(schwerpunktebene.descriptionEn || '');
      setHerkunftDe(schwerpunktebene.herkunftDe || '');
      setHerkunftEn(schwerpunktebene.herkunftEn || '');
      setZielDe(schwerpunktebene.zielDe || '');
      setZielEn(schwerpunktebene.zielEn || '');
      setImageUrl(schwerpunktebene.imageUrl || '');
      setTrackingCategories(
        schwerpunktebene.trackingCategories && Array.isArray(schwerpunktebene.trackingCategories)
          ? schwerpunktebene.trackingCategories
          : []
      );
      setExerciseDays(('exerciseDays' in schwerpunktebene ? schwerpunktebene.exerciseDays : 20) as number);
      setErrorMessage(null);
    }
  }, [schwerpunktebene]);

  const updateMutation = trpc.schwerpunktebenen.update.useMutation({
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      setErrorMessage(error.message);
    },
  });

  const handleSubmit = async () => {
    if (!schwerpunktebene) return;

    if (!titleDe.trim()) {
      setErrorMessage('German title is required');
      return;
    }

    setErrorMessage(null);
    await updateMutation.mutateAsync({
      id: schwerpunktebene.id,
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
      trackingCategories: trackingCategories.length > 0
        ? trackingCategories.filter((c) => c.label.trim())
        : null,
      exerciseDays,
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
          {/* Month Number */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Month Number</label>
            <Select
              value={levelNumber}
              onValueChange={(value: '1' | '2' | '3') => setMonthNumber(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">
                  Month 1
                </SelectItem>
                <SelectItem value="2">
                  Month 2
                </SelectItem>
                <SelectItem value="3">
                  Month 3
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

          {/* Image */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Image</label>
            <FileDropZone
              accept="image/*"
              endpoint="/api/upload/image"
              label="Upload image"
              hint="JPG, PNG, WebP, SVG — max 10 MB"
              value={imageUrl}
              onChange={setImageUrl}
              onError={setErrorMessage}
            />
          </div>

          {/* Exercise Days */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-rdy-gray-600">Exercise-Tage</label>
            <p className="text-xs text-rdy-gray-400">
              Anzahl Tage f&uuml;r Exercises in diesem Modul (Standard: 20, BASICS: 6)
            </p>
            <Input
              type="number"
              min={1}
              max={90}
              value={exerciseDays}
              onChange={(e) => setExerciseDays(parseInt(e.target.value, 10) || 20)}
              className="w-24"
            />
          </div>

          {/* Tracking Categories */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">
              Tracking-Kategorien
            </label>
            <p className="text-xs text-rdy-gray-400">
              Definiere die Tracking-Themen f&uuml;r dieses Modul (z.B. Stresslevel, Atmung, K&ouml;rper, Gedanken).
            </p>
            <div className="space-y-2">
              {trackingCategories.map((cat, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="Label (z.B. Stresslevel)"
                    value={cat.label}
                    onChange={(e) => {
                      const updated = [...trackingCategories];
                      updated[index] = {
                        ...updated[index],
                        label: e.target.value,
                        key: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                      };
                      setTrackingCategories(updated);
                    }}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Icon"
                    value={cat.emoji}
                    onChange={(e) => {
                      const updated = [...trackingCategories];
                      updated[index] = { ...updated[index], emoji: e.target.value };
                      setTrackingCategories(updated);
                    }}
                    className="w-20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTrackingCategories(trackingCategories.filter((_, i) => i !== index));
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    X
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setTrackingCategories([
                  ...trackingCategories,
                  { key: '', label: '', emoji: 'flame' },
                ]);
              }}
              className="text-xs"
            >
              + Kategorie hinzuf&uuml;gen
            </Button>
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
