'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
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
      <DialogContent className="border-gray-800 bg-gray-900 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">AI Translation</DialogTitle>
          <DialogDescription className="text-gray-400">
            Translate {fieldName} from {getLanguageName(sourceLang)} to {getLanguageName(targetLang)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Source Text */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Source ({getLanguageName(sourceLang)})
            </label>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              className="min-h-24 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder={`Enter ${getLanguageName(sourceLang)} text...`}
            />
          </div>

          {/* Translate Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleTranslate}
              disabled={translateMutation.isPending || !sourceText.trim()}
              className="w-full"
            >
              {translateMutation.isPending ? 'Translating...' : `Translate to ${getLanguageName(targetLang)}`}
            </Button>
          </div>

          {/* Translated Text */}
          {translatedText && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">
                  Translation ({getLanguageName(targetLang)})
                </label>
                <Button variant="ghost" size="sm" onClick={handleCopy} className="text-xs">
                  Copy to Clipboard
                </Button>
              </div>
              <div className="rounded-md border border-gray-700 bg-gray-800 p-3">
                <p className="text-white">{translatedText}</p>
              </div>
            </div>
          )}

          {/* Error/Info Message */}
          {errorMessage && (
            <div className="rounded-md bg-yellow-900/20 p-3 text-sm text-yellow-400">
              {errorMessage}
            </div>
          )}

          {/* Instructions */}
          <div className="rounded-md bg-gray-800 p-3">
            <h4 className="text-sm font-medium text-gray-300">How to use:</h4>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-gray-400">
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
          <Button variant="outline" onClick={() => handleClose(false)} className="border-gray-700">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
