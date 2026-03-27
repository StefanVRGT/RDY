'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { format } from 'date-fns';
import { MobileLayout } from '@/components/mobile';
import { CheckCircle2, MessageSquare } from 'lucide-react';

export default function MentorMenteeReflectionsPage() {
  const params = useParams<{ menteeId: string }>();
  const menteeId = params.menteeId;

  const { data: reflections, isLoading } = trpc.mentor.getMenteeReflections.useQuery({ menteeId });
  const utils = trpc.useUtils();

  const saveFeedback = trpc.mentor.saveReflectionFeedback.useMutation({
    onSuccess: () => utils.mentor.getMenteeReflections.invalidate({ menteeId }),
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  const startEditing = useCallback((id: string, existing: string | null) => {
    setEditingId(id);
    setFeedbackText(existing || '');
  }, []);

  const handleSave = useCallback(() => {
    if (!editingId || !feedbackText.trim()) return;
    saveFeedback.mutate({ reflectionId: editingId, feedback: feedbackText });
    setEditingId(null);
  }, [editingId, feedbackText, saveFeedback]);

  return (
    <MobileLayout title="REFLECTIONS" showBack>
      <div className="px-5 py-6">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 rounded-full border-2 border-rdy-orange-500 border-t-transparent animate-spin" />
          </div>
        ) : !reflections?.length ? (
          <p className="text-center text-xs text-rdy-gray-400 py-16">
            Keine Reflections eingereicht
          </p>
        ) : (
          <div className="space-y-6">
            {reflections.map((r) => {
              const responses = r.responses as Array<{ question: string; answer: string }>;
              return (
                <div key={r.id} className="rounded-xl border border-rdy-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-rdy-black">{r.moduleTitleDe}</h3>
                    {r.submittedAt && (
                      <span className="text-[10px] text-rdy-gray-400">
                        {format(new Date(r.submittedAt), 'dd.MM.yyyy')}
                      </span>
                    )}
                  </div>

                  {responses.map((resp, i) => (
                    <div key={i} className="mb-3">
                      <p className="text-xs font-medium text-rdy-gray-500 mb-0.5">
                        {i + 1}. {resp.question}
                      </p>
                      <p className="text-sm text-rdy-black">{resp.answer || '—'}</p>
                    </div>
                  ))}

                  {/* Feedback section */}
                  <div className="mt-4 pt-3 border-t border-rdy-gray-200">
                    {editingId === r.id ? (
                      <div>
                        <textarea
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          rows={3}
                          className="w-full p-3 rounded-xl bg-rdy-gray-100 border-none text-sm text-rdy-gray-600 placeholder:text-rdy-gray-300 focus:outline-none focus:ring-2 focus:ring-rdy-orange-500/30 resize-none"
                          placeholder="Dein Feedback..."
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={handleSave}
                            disabled={saveFeedback.isPending}
                            className="px-4 py-2 rounded-lg bg-rdy-orange-500 text-white text-xs font-medium"
                          >
                            Speichern
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-4 py-2 rounded-lg bg-rdy-gray-100 text-rdy-gray-600 text-xs"
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    ) : r.mentorFeedback ? (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          <span className="text-[10px] text-green-600 font-medium">Feedback gegeben</span>
                        </div>
                        <p className="text-sm text-rdy-gray-600">{r.mentorFeedback}</p>
                        <button
                          onClick={() => startEditing(r.id, r.mentorFeedback)}
                          className="mt-2 text-xs text-rdy-orange-500"
                        >
                          Bearbeiten
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing(r.id, null)}
                        className="flex items-center gap-1.5 text-xs text-rdy-orange-500"
                      >
                        <MessageSquare className="h-3 w-3" />
                        Feedback geben
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
