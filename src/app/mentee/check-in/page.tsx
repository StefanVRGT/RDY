'use client';

import { useState, useCallback, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { MobileLayout } from '@/components/mobile';
import { RdyFooter } from '@/components/rdy-footer';
import { CheckCircle2, Send } from 'lucide-react';

const CHECK_IN_QUESTIONS = [
  'Wie w\u00fcrdest du deinen aktuellen Stresslevel beschreiben?',
  'Was sind deine Erwartungen an die RDY Masterclass?',
  'Welche Bereiche m\u00f6chtest du besonders entwickeln?',
  'Wie ist deine aktuelle k\u00f6rperliche Verfassung?',
  'Was motiviert dich, an diesem Programm teilzunehmen?',
];

export default function CheckInPage() {
  const { data: existingEntry, isLoading } = trpc.mentee.getCheckIn.useQuery();
  const utils = trpc.useUtils();

  const saveMutation = trpc.mentee.saveCheckIn.useMutation({
    onSuccess: () => {
      utils.mentee.getCheckIn.invalidate();
      utils.mentee.getCheckInStatus.invalidate();
    },
  });

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (existingEntry?.responses) {
      const responses = existingEntry.responses as Array<{ question: string; answer: string }>;
      const map: Record<number, string> = {};
      responses.forEach((r, i) => {
        map[i] = r.answer;
      });
      setAnswers(map);
      setSubmitted(!!existingEntry.submittedAt);
    }
  }, [existingEntry]);

  const handleSaveDraft = useCallback(() => {
    const responses = CHECK_IN_QUESTIONS.map((q, i) => ({
      question: q,
      answer: answers[i] || '',
    }));
    saveMutation.mutate({ responses, submit: false });
  }, [answers, saveMutation]);

  const handleSubmit = useCallback(() => {
    const responses = CHECK_IN_QUESTIONS.map((q, i) => ({
      question: q,
      answer: answers[i] || '',
    }));
    saveMutation.mutate({ responses, submit: true });
    setSubmitted(true);
  }, [answers, saveMutation]);

  return (
    <MobileLayout title="CHECK-IN" showBack>
      <div className="px-5 py-6">
        <h2 className="text-center text-xs uppercase tracking-widest text-rdy-gray-400 mb-2">
          RDY Check-In
        </h2>
        <p className="text-center text-sm text-rdy-gray-500 mb-6">
          Bitte f{"u\u0308"}lle diesen Fragebogen vor Beginn von Modul 1 aus.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 rounded-full border-2 border-rdy-orange-500 border-t-transparent animate-spin" />
          </div>
        ) : submitted ? (
          <div className="py-12 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-semibold text-rdy-black">Eingereicht</p>
            <p className="mt-2 text-xs text-rdy-gray-400">
              Dein Check-In wurde gespeichert. Viel Erfolg bei der Masterclass!
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-5">
              {CHECK_IN_QUESTIONS.map((question, idx) => (
                <div key={idx}>
                  <p className="text-sm font-medium text-rdy-black mb-2">
                    {idx + 1}. {question}
                  </p>
                  <textarea
                    value={answers[idx] || ''}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [idx]: e.target.value }))
                    }
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
