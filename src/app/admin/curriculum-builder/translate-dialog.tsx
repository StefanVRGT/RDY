'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TranslateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialText: string;
  sourceLang: 'de' | 'en';
  targetLang: 'de' | 'en';
  fieldName: string;
}

export function TranslateDialog({
  open,
  onOpenChange,
  initialText,
  sourceLang,
  targetLang,
  fieldName,
}: TranslateDialogProps) {
  const [sourceText, setSourceText] = useState(initialText);
  const [translatedText, setTranslatedText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const translateMutation = trpc.curriculumBuilder.translateText.useMutation({
    onSuccess: (data) => {
      setTranslatedText(data.translatedText);
      if (data.note) {
        setErrorMessage(data.note);
      }
    },
    onError: (error) => {
      setErrorMessage(error.message);
    },
  });

  useEffect(() => {
    if (open) {
      setSourceText(initialText);
      setTranslatedText('');
      setErrorMessage(null);
    }
  }, [open, initialText]);

  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      setErrorMessage('Please enter text to translate');
      return;
    }

    setErrorMessage(null);
    await translateMutation.mutateAsync({
      text: sourceText,
      sourceLang,
      targetLang,
    });
  };

  const handleCopy = async () => {
    if (translatedText) {
      await navigator.clipboard.writeText(translatedText);
    }
  };

  const handleClose = (openState: boolean) => {
    if (!openState) {
      setSourceText('');
      setTranslatedText('');
      setErrorMessage(null);
    }
    onOpenChange(openState);
  };

  const getLanguageName = (lang: 'de' | 'en') => {
    return lang === 'de' ? 'German' : 'English';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>AI Translation</DialogTitle>
          <DialogDescription>
            Translate {fieldName} from {getLanguageName(sourceLang)} to {getLanguageName(targetLang)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Source Text */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">
              Source ({getLanguageName(sourceLang)})
            </label>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              className="min-h-24 w-full rounded-md border border-rdy-gray-200 bg-white px-3 py-2 placeholder:text-gray-500 focus:border-rdy-orange-500 focus:outline-none focus:ring-1 focus:ring-rdy-orange-500"
              placeholder={`Enter ${getLanguageName(sourceLang)} text...`}
            />
          </div>

          {/* Translate Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleTranslate}
              disabled={translateMutation.isPending || !sourceText.trim()}
              className="w-full bg-rdy-orange-500 text-white hover:bg-rdy-orange-600"
            >
              {translateMutation.isPending ? 'Translating...' : `Translate to ${getLanguageName(targetLang)}`}
            </Button>
          </div>

          {/* Translated Text */}
          {translatedText && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-rdy-gray-600">
                  Translation ({getLanguageName(targetLang)})
                </label>
                <Button variant="ghost" size="sm" onClick={handleCopy} className="text-xs">
                  Copy to Clipboard
                </Button>
              </div>
              <div className="rounded-md border border-rdy-gray-200 bg-rdy-gray-100 p-3">
                <p>{translatedText}</p>
              </div>
            </div>
          )}

          {/* Error/Info Message */}
          {errorMessage && (
            <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-600">
              {errorMessage}
            </div>
          )}

          {/* Instructions */}
          <div className="rounded-md bg-rdy-gray-100 p-3">
            <h4 className="text-sm font-medium text-rdy-gray-600">How to use:</h4>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-rdy-gray-400">
              <li>Enter or modify the source text above</li>
              <li>Click &quot;Translate&quot; to get the AI translation</li>
              <li>Copy the translated text and paste it into the appropriate field</li>
            </ol>
            <p className="mt-2 text-xs text-gray-500">
              Powered by AI. Translation quality depends on your tenant&apos;s AI configuration.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} className="border-rdy-gray-200">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
