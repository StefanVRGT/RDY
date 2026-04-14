'use client';

import { useState, useCallback, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { format, startOfDay } from 'date-fns';
import { MobileLayout } from '@/components/mobile';
import { RdyFooter } from '@/components/rdy-footer';
import { VoiceRecorder } from '@/components/voice-recorder/voice-recorder';
import { cn } from '@/lib/utils';
import { Mic, Flame, Wind, Activity, Brain, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  stress: Flame,
  breathing: Wind,
  body: Activity,
  thoughts: Brain,
};

const DEFAULT_CATEGORIES = [
  { key: 'stress', label: 'Stresslevel', emoji: '' },
  { key: 'breathing', label: 'Atmung', emoji: '' },
  { key: 'body', label: 'Körper', emoji: '' },
  { key: 'thoughts', label: 'Gedanken', emoji: '' },
];

export default function ReflectPage() {
  const today = startOfDay(new Date());
  const dateStr = format(today, 'yyyy-MM-dd') + 'T00:00:00.000Z';
  const dayEnd = format(today, 'yyyy-MM-dd') + 'T23:59:59.999Z';

  // ── Tracking categories (from mentor or defaults) ──
  const { data: categories } = trpc.mentee.getTrackingCategories.useQuery();
  const TRACKING_CATEGORIES = categories || DEFAULT_CATEGORIES;

  // ── Tracking ──
  const { data: trackingEntries, isLoading: loadingTracking } =
    trpc.mentee.getTrackingForDate.useQuery({ date: dateStr });

  const utils = trpc.useUtils();

  const saveMutation = trpc.mentee.saveTracking.useMutation({
    onSuccess: () => utils.mentee.getTrackingForDate.invalidate({ date: dateStr }),
  });

  const deleteMutation = trpc.mentee.deleteTracking.useMutation({
    onSuccess: () => utils.mentee.getTrackingForDate.invalidate({ date: dateStr }),
  });

  const [tappedKey, setTappedKey] = useState<string | null>(null);

  const handleTap = useCallback(
    (category: string) => {
      setTappedKey(category);
      saveMutation.mutate({ category });
      setTimeout(() => setTappedKey(null), 600);
    },
    [saveMutation]
  );

  // ── Diary prompts (guiding questions for this week) ──
  const { data: diaryPrompts } = trpc.mentee.getDiaryPrompts.useQuery();

  // ── Diary ──
  const { data: diaryEntries, isLoading: loadingDiary } = trpc.diary.getEntries.useQuery({
    startDate: dateStr,
    endDate: dayEnd,
    limit: 1,
    sortOrder: 'desc',
  });

  const [diaryText, setDiaryText] = useState('');
  const [entryId, setEntryId] = useState<string | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);

  useEffect(() => {
    const entry = diaryEntries?.[0];
    if (entry) {
      setEntryId(entry.id);
      setDiaryText(entry.content ?? '');
    } else {
      setEntryId(null);
      setDiaryText('');
    }
  }, [diaryEntries]);

  const createEntry = trpc.diary.createEntry.useMutation({
    onSuccess: (data) => {
      setEntryId(data.id);
      utils.diary.getEntries.invalidate();
    },
  });

  const updateEntry = trpc.diary.updateEntry.useMutation({
    onSuccess: () => utils.diary.getEntries.invalidate(),
  });


  const handleSaveDiary = useCallback(() => {
    if (!diaryText.trim()) return;
    if (entryId) {
      updateEntry.mutate({ id: entryId, content: diaryText });
    } else {
      createEntry.mutate({ content: diaryText, entryDate: dateStr });
    }
  }, [diaryText, entryId, dateStr, updateEntry, createEntry]);

  const [transcribing, setTranscribing] = useState(false);

  const handleVoiceComplete = useCallback(async (blob: Blob) => {
    // Transcribe directly via Whisper API
    setTranscribing(true);
    setShowRecorder(false);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');
      const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        console.error('Transcription failed:', err.error);
        return;
      }
      const { text } = (await res.json()) as { text: string };
      if (text) {
        // Append transcription to diary text
        const newText = diaryText ? `${diaryText}\n\n${text}` : text;
        setDiaryText(newText);
        // Auto-save
        if (entryId) {
          updateEntry.mutate({ id: entryId, content: newText });
        } else {
          createEntry.mutate({ content: newText, entryDate: dateStr });
        }
      }
    } finally {
      setTranscribing(false);
    }
  }, [diaryText, entryId, dateStr, updateEntry, createEntry]);

  const isLoading = loadingTracking || loadingDiary;

  return (
    <MobileLayout title="TODAY" showMenu>
      <div className="px-5 py-5">
        <p className="text-center text-xs uppercase tracking-widest text-rdy-gray-400 mb-6">
          {format(today, 'd. MMMM yyyy')}
        </p>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 rounded-full border-2 border-rdy-orange-500 border-t-transparent animate-spin" />
          </div>
        ) : (
          <>
            {/* ── TRACKING ─────────────────────────────── */}
            <h2 className="text-sm font-semibold uppercase tracking-wider text-rdy-black mb-3">
              Tracking
            </h2>

            <div className="grid grid-cols-2 gap-2 mb-5">
              {TRACKING_CATEGORIES.map((cat) => {
                const isActive = tappedKey === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => handleTap(cat.key)}
                    disabled={saveMutation.isPending}
                    className={cn(
                      'flex items-center gap-2.5 px-4 py-3.5 rounded-xl border transition-all active:scale-95',
                      isActive
                        ? 'bg-rdy-orange-500 border-rdy-orange-500 text-white scale-95'
                        : 'bg-rdy-gray-100 border-rdy-gray-200 text-rdy-black'
                    )}
                  >
                    {(() => {
                      const Icon = ICON_MAP[cat.key];
                      return Icon ? <Icon className="h-5 w-5" /> : <Flame className="h-5 w-5" />;
                    })()}
                    <span className="text-sm font-medium">{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Timeline */}
            {trackingEntries && trackingEntries.length > 0 && (
              <div className="mb-6">
                <p className="text-xs uppercase tracking-wider text-rdy-gray-400 mb-2">
                  Heute geloggt
                </p>
                <div className="space-y-1">
                  {trackingEntries.map((entry) => {
                    const cat = TRACKING_CATEGORIES.find((c) => c.key === entry.category);
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rdy-gray-100 text-xs"
                      >
                        <span className="text-rdy-gray-400 tabular-nums w-10 shrink-0">
                          {format(new Date(entry.recordedAt), 'HH:mm')}
                        </span>
                        {(() => {
                          const Icon = cat ? ICON_MAP[cat.key] : null;
                          return Icon ? <Icon className="h-3 w-3 text-rdy-gray-500" /> : null;
                        })()}
                        <span className="flex-1 text-rdy-gray-600">{cat?.label || entry.category}</span>
                        <button
                          onClick={() => deleteMutation.mutate({ id: entry.id })}
                          disabled={deleteMutation.isPending}
                          className="ml-auto p-1 rounded text-rdy-gray-300 hover:text-red-400 transition-colors"
                          aria-label="Eintrag löschen"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── DIARY / REFLECTION ────────────────────── */}
            <div className="border-t border-rdy-gray-200 pt-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-rdy-black mb-2">
                Reflection
              </h2>

              {/* Weekly guiding questions */}
              {diaryPrompts && diaryPrompts.length > 0 && (
                <div className="mb-3 rounded-lg bg-rdy-orange-500/5 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-rdy-orange-500 font-medium mb-1">
                    Leitfragen dieser Woche
                  </p>
                  {diaryPrompts.map((prompt, i) => (
                    <p key={i} className="text-xs text-rdy-gray-500 leading-relaxed">
                      &bull; {prompt}
                    </p>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2">
                <textarea
                  value={diaryText}
                  onChange={(e) => setDiaryText(e.target.value)}
                  onBlur={handleSaveDiary}
                  placeholder="Notizen..."
                  rows={4}
                  className="flex-1 p-3 rounded-xl bg-rdy-gray-100 border-none text-sm text-rdy-gray-600 placeholder:text-rdy-gray-300 focus:outline-none focus:ring-2 focus:ring-rdy-orange-500/30 resize-none overflow-y-auto max-h-40"
                />

                <button
                  onClick={() => setShowRecorder(!showRecorder)}
                  className={cn(
                    'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90',
                    showRecorder
                      ? 'bg-rdy-orange-500 text-white'
                      : 'bg-rdy-gray-100 text-rdy-gray-500'
                  )}
                >
                  <Mic className="h-5 w-5" />
                </button>
              </div>

              {showRecorder && (
                <div className="mt-3">
                  <VoiceRecorder onRecordingComplete={handleVoiceComplete} />
                </div>
              )}

              {transcribing && (
                <p className="mt-2 text-xs text-rdy-orange-500 animate-pulse">
                  Transkribiere...
                </p>
              )}
            </div>
          </>
        )}

        <RdyFooter />
      </div>
    </MobileLayout>
  );
}
