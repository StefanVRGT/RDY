'use client';

import { useState, useCallback, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { startOfWeek } from 'date-fns';
import { MobileLayout } from '@/components/mobile';
import { RdyFooter } from '@/components/rdy-footer';
import { CheckCircle2, Send } from 'lucide-react';

// Default reflection questions (will come from admin config per module later)
const DEFAULT_QUESTIONS = [
  'Was hast du in diesem Modul über dich gelernt?',
  'Welche Übungen haben dir am meisten geholfen?',
  'Was war deine grösste Herausforderung?',
  'Was möchtest du im nächsten Modul anders machen?',
  'Wie hat sich dein Bewusstsein für die Tracking-Themen verändert?',
];

export default function ReflectionPage() {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  const { data: weekThemeData } = trpc.mentee.getCurrentWeekTheme.useQuery({
    weekStartDate: weekStart.toISOString(),
  });

  const schwerpunktebeneId = weekThemeData?.monthTheme?.id;

  // Use admin-configured questions or fall back to defaults
  const configuredQuestions = weekThemeData?.monthTheme?.reflectionQuestions;
  const questions: string[] =
    Array.isArray(configuredQuestions) && configuredQuestions.length > 0
      ? (configuredQuestions as string[])
      : DEFAULT_QUESTIONS;

  const { data: existingEntry, isLoading } = trpc.mentee.getReflection.useQuery(
    { schwerpunktebeneId: schwerpunktebeneId! },
    { enabled: !!schwerpunktebeneId }
  );

  const utils = trpc.useUtils();

  const saveMutation = trpc.mentee.saveReflection.useMutation({
    onSuccess: () => {
      if (schwerpunktebeneId) {
        utils.mentee.getReflection.invalidate({ schwerpunktebeneId });
      }
    },
  });

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (existingEntry?.responses) {
      const responses = existingEntry.responses as Array<{ question: string; answer: string }>;
      const map: Record<number, string> = {};
      responses.forEach((r, i) => { map[i] = r.answer; });
      setAnswers(map);
      setSubmitted(!!existingEntry.submittedAt);
    }
  }, [existingEntry]);

  const handleSaveDraft = useCallback(() => {
    if (!schwerpunktebeneId) return;
    const responses = questions.map((q, i) => ({
      question: q,
      answer: answers[i] || '',
    }));
    saveMutation.mutate({ schwerpunktebeneId, responses, submit: false });
  }, [schwerpunktebeneId, answers, saveMutation]);

  const handleSubmit = useCallback(() => {
    if (!schwerpunktebeneId) return;
    const responses = questions.map((q, i) => ({
      question: q,
      answer: answers[i] || '',
    }));
    saveMutation.mutate({ schwerpunktebeneId, responses, submit: true });
    setSubmitted(true);
  }, [schwerpunktebeneId, answers, saveMutation]);

  const moduleName = weekThemeData?.monthTheme?.titleDe || 'Aktuelles Modul';

  return (
    <MobileLayout title="REFLECTION" showBack>
      <div className="px-5 py-6">
        <h2 className="text-center text-xs uppercase tracking-widest text-rdy-gray-400 mb-2">
          Reflection Sheet
        </h2>
        <p className="text-center text-sm font-semibold text-rdy-black mb-6">
          {moduleName}
        </p>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 rounded-full border-2 border-rdy-orange-500 border-t-transparent animate-spin" />
          </div>
        ) : !schwerpunktebeneId ? (
          <p className="text-center text-xs text-rdy-gray-400 py-16">
            Kein Modul zugewiesen
          </p>
        ) : submitted ? (
          <div className="py-12 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-semibold text-rdy-black">Eingereicht</p>
            <p className="mt-2 text-xs text-rdy-gray-400">
              Dein Mentor wird dir Feedback geben.
            </p>
            {existingEntry?.mentorFeedback && (
              <div className="mt-6 rounded-xl bg-rdy-gray-100 p-4 text-left">
                <p className="text-xs font-medium uppercase tracking-wider text-rdy-gray-500 mb-2">
                  Mentor Feedback
                </p>
                <p className="text-sm text-rdy-gray-600">{existingEntry.mentorFeedback}</p>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-5">
              {questions.map((question, idx) => (
                <div key={idx}>
                  <p className="text-sm font-medium text-rdy-black mb-2">
                    {idx + 1}. {question}
                  </p>
                  <textarea
                    value={answers[idx] || ''}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [idx]: e.target.value }))}
                    onBlur={handleSaveDraft}
                    placeholder="Deine Antwort..."
                    rows={3}
                    className="w-full p-3 rounded-xl bg-rdy-gray-100 border-none text-sm text-rdy-gray-600 placeholder:text-rdy-gray-300 focus:outline-none focus:ring-2 focus:ring-rdy-orange-500/30 resize-none"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              disabled={saveMutation.isPending}
              className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rdy-orange-500 text-white text-sm font-semibold uppercase tracking-wide active:opacity-80 transition-opacity disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Einreichen
            </button>

            <p className="mt-2 text-center text-[10px] text-rdy-gray-400">
              Entwurf wird automatisch gespeichert
            </p>
          </>
        )}

        <RdyFooter />
      </div>
    </MobileLayout>
  );
}
