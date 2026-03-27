'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { MobileLayout } from '@/components/mobile';
import { Plus, X, Save } from 'lucide-react';

const DEFAULTS = [
  { key: 'stress', label: 'Stresslevel', emoji: 'flame' },
  { key: 'breathing', label: 'Atmung', emoji: 'wind' },
  { key: 'body', label: 'Körper', emoji: 'activity' },
  { key: 'thoughts', label: 'Gedanken', emoji: 'brain' },
];

type Category = { key: string; label: string; emoji: string };

export default function MentorMenteeSettingsPage() {
  const params = useParams<{ menteeId: string }>();
  const menteeId = params.menteeId;

  const { data: existingCategories } = trpc.mentor.getMenteeTrackingCategories.useQuery({ menteeId });
  const utils = trpc.useUtils();

  const saveMutation = trpc.mentor.setMenteeTrackingCategories.useMutation({
    onSuccess: () => utils.mentor.getMenteeTrackingCategories.invalidate({ menteeId }),
  });

  const [categories, setCategories] = useState<Category[]>(DEFAULTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (existingCategories && existingCategories.length > 0) {
      setCategories(existingCategories);
    }
  }, [existingCategories]);

  const addCategory = useCallback(() => {
    setCategories((prev) => [
      ...prev,
      { key: `custom_${Date.now()}`, label: '', emoji: '📌' },
    ]);
  }, []);

  const removeCategory = useCallback((idx: number) => {
    setCategories((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateCategory = useCallback((idx: number, field: keyof Category, value: string) => {
    setCategories((prev) =>
      prev.map((c, i) => {
        if (i !== idx) return c;
        const updated = { ...c, [field]: value };
        if (field === 'label') {
          updated.key = value.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 50);
        }
        return updated;
      })
    );
  }, []);

  const handleSave = useCallback(() => {
    const valid = categories.filter((c) => c.label.trim());
    saveMutation.mutate({ menteeId, categories: valid });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [categories, menteeId, saveMutation]);

  return (
    <MobileLayout title="TRACKING THEMEN" showBack>
      <div className="px-5 py-6">
        <p className="text-xs text-rdy-gray-400 mb-6">
          Definiere die Tracking-Kategorien für diesen Mentee. Der Mentee sieht diese auf seiner Reflect-Seite.
        </p>

        <div className="space-y-3">
          {categories.map((cat, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                value={cat.emoji}
                onChange={(e) => updateCategory(idx, 'emoji', e.target.value)}
                className="w-10 h-10 text-center text-lg rounded-lg bg-rdy-gray-100 border-none focus:outline-none focus:ring-2 focus:ring-rdy-orange-500/30"
                maxLength={4}
              />
              <input
                value={cat.label}
                onChange={(e) => updateCategory(idx, 'label', e.target.value)}
                placeholder="Kategorie..."
                className="flex-1 h-10 px-3 rounded-lg bg-rdy-gray-100 border-none text-sm text-rdy-gray-600 placeholder:text-rdy-gray-300 focus:outline-none focus:ring-2 focus:ring-rdy-orange-500/30"
              />
              <button
                onClick={() => removeCategory(idx)}
                className="w-10 h-10 flex items-center justify-center rounded-lg text-rdy-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addCategory}
          className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-rdy-gray-100 text-sm text-rdy-gray-500"
        >
          <Plus className="h-4 w-4" />
          Kategorie hinzufügen
        </button>

        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rdy-orange-500 text-white text-sm font-semibold uppercase tracking-wide active:opacity-80 transition-opacity disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saved ? 'Gespeichert' : 'Speichern'}
        </button>
      </div>
    </MobileLayout>
  );
}
