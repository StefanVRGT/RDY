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

type ContextType = 'herkunft' | 'ziel' | 'both';
type Language = 'de' | 'en';

interface ContextGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  title?: string;
  language: Language;
  contextType: ContextType;
  onApply?: (herkunft: string | null, ziel: string | null) => void;
}

export function ContextGenerationDialog({
  open,
  onOpenChange,
  description: initialDescription,
  title: initialTitle,
  language,
  contextType,
  onApply,
}: ContextGenerationDialogProps) {
  const [description, setDescription] = useState(initialDescription);
  const [title, setTitle] = useState(initialTitle || '');
  const [additionalContext, setAdditionalContext] = useState('');
  const [generatedHerkunft, setGeneratedHerkunft] = useState('');
  const [generatedZiel, setGeneratedZiel] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Individual mutations for herkunft and ziel
  const generateHerkunftMutation = trpc.curriculumBuilder.generateHerkunft.useMutation({
    onSuccess: (data) => {
      setGeneratedHerkunft(data.generatedText);
    },
    onError: (error) => {
      setErrorMessage(error.message);
    },
  });

  const generateZielMutation = trpc.curriculumBuilder.generateZiel.useMutation({
    onSuccess: (data) => {
      setGeneratedZiel(data.generatedText);
    },
    onError: (error) => {
      setErrorMessage(error.message);
    },
  });

  const generateBothMutation = trpc.curriculumBuilder.generateBothContexts.useMutation({
    onSuccess: (data) => {
      setGeneratedHerkunft(data.herkunft.generatedText);
      setGeneratedZiel(data.ziel.generatedText);
    },
    onError: (error) => {
      setErrorMessage(error.message);
    },
  });

  useEffect(() => {
    if (open) {
      setDescription(initialDescription);
      setTitle(initialTitle || '');
      setAdditionalContext('');
      setGeneratedHerkunft('');
      setGeneratedZiel('');
      setErrorMessage(null);
    }
  }, [open, initialDescription, initialTitle]);

  const handleGenerate = async () => {
    if (!description.trim()) {
      setErrorMessage('Please enter a description to generate context from');
      return;
    }

    setErrorMessage(null);
    setGeneratedHerkunft('');
    setGeneratedZiel('');

    const params = {
      description,
      language,
      title: title || undefined,
      additionalContext: additionalContext || undefined,
    };

    if (contextType === 'both') {
      await generateBothMutation.mutateAsync(params);
    } else if (contextType === 'herkunft') {
      await generateHerkunftMutation.mutateAsync(params);
    } else {
      await generateZielMutation.mutateAsync(params);
    }
  };

  const handleCopy = async (text: string) => {
    if (text) {
      await navigator.clipboard.writeText(text);
    }
  };

  const handleApply = () => {
    if (onApply) {
      const herkunft = contextType === 'ziel' ? null : (generatedHerkunft || null);
      const ziel = contextType === 'herkunft' ? null : (generatedZiel || null);
      onApply(herkunft, ziel);
    }
    onOpenChange(false);
  };

  const handleClose = (openState: boolean) => {
    if (!openState) {
      setDescription('');
      setTitle('');
      setAdditionalContext('');
      setGeneratedHerkunft('');
      setGeneratedZiel('');
      setErrorMessage(null);
    }
    onOpenChange(openState);
  };

  const getLanguageName = (lang: Language) => {
    return lang === 'de' ? 'German' : 'English';
  };

  const getContextTypeName = (type: ContextType) => {
    if (type === 'both') return 'Herkunft & Ziel';
    if (type === 'herkunft') return 'Herkunft (Background)';
    return 'Ziel (Goal)';
  };

  const isGenerating =
    generateHerkunftMutation.isPending ||
    generateZielMutation.isPending ||
    generateBothMutation.isPending;

  const hasGeneratedContent =
    (contextType !== 'ziel' && generatedHerkunft) ||
    (contextType !== 'herkunft' && generatedZiel);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate {getContextTypeName(contextType)}</DialogTitle>
          <DialogDescription>
            Use AI to auto-generate {getContextTypeName(contextType).toLowerCase()} content in{' '}
            {getLanguageName(language)} based on the description.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title (optional) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-rdy-gray-200 bg-white px-3 py-2 placeholder:text-gray-500 focus:border-rdy-orange-500 focus:outline-none focus:ring-1 focus:ring-rdy-orange-500"
              placeholder="Enter title for additional context..."
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-24 w-full rounded-md border border-rdy-gray-200 bg-white px-3 py-2 placeholder:text-gray-500 focus:border-rdy-orange-500 focus:outline-none focus:ring-1 focus:ring-rdy-orange-500"
              placeholder="Enter the description to generate context from..."
            />
          </div>

          {/* Additional Context (optional) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Additional Context (optional)</label>
            <textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              className="min-h-16 w-full rounded-md border border-rdy-gray-200 bg-white px-3 py-2 placeholder:text-gray-500 focus:border-rdy-orange-500 focus:outline-none focus:ring-1 focus:ring-rdy-orange-500"
              placeholder="E.g., 'This is for a week about mindfulness meditation'..."
            />
          </div>

          {/* Generate Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !description.trim()}
              className="w-full bg-rdy-orange-500 text-white hover:bg-rdy-orange-600"
              data-testid="generate-context-button"
            >
              {isGenerating ? 'Generating...' : `Generate ${getContextTypeName(contextType)}`}
            </Button>
          </div>

          {/* Generated Herkunft */}
          {(contextType === 'both' || contextType === 'herkunft') && generatedHerkunft && (
            <div className="space-y-2" data-testid="generated-herkunft-preview">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-rdy-orange-500">
                  Herkunft (Background) - Preview
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(generatedHerkunft)}
                  className="text-xs"
                >
                  Copy
                </Button>
              </div>
              <div className="rounded-md border border-amber-300/50 bg-amber-50 p-3">
                <p className="whitespace-pre-wrap">{generatedHerkunft}</p>
              </div>
            </div>
          )}

          {/* Generated Ziel */}
          {(contextType === 'both' || contextType === 'ziel') && generatedZiel && (
            <div className="space-y-2" data-testid="generated-ziel-preview">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-green-600">
                  Ziel (Goal) - Preview
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(generatedZiel)}
                  className="text-xs"
                >
                  Copy
                </Button>
              </div>
              <div className="rounded-md border border-green-300/50 bg-green-50 p-3">
                <p className="whitespace-pre-wrap">{generatedZiel}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-500" data-testid="context-generation-error">
              {errorMessage}
            </div>
          )}

          {/* Instructions */}
          <div className="rounded-md bg-rdy-gray-100 p-3">
            <h4 className="text-sm font-medium text-rdy-gray-600">About Herkunft & Ziel:</h4>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-rdy-gray-400">
              <li>
                <span className="text-rdy-orange-500">Herkunft</span>: Background/origin - explains where
                the concept or exercise comes from
              </li>
              <li>
                <span className="text-green-600">Ziel</span>: Goal/purpose - describes what the
                participant will achieve
              </li>
            </ul>
            <p className="mt-2 text-xs text-gray-500">
              Powered by AI. Review the generated content before saving.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleClose(false)} className="border-rdy-gray-200">
            Cancel
          </Button>
          {hasGeneratedContent && onApply && (
            <Button onClick={handleApply} className="bg-rdy-orange-500 text-white hover:bg-rdy-orange-600" data-testid="apply-generated-context-button">
              Apply to Form
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
