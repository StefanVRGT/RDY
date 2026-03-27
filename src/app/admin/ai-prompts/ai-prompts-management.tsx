'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

// The transcription prompt is hardcoded in the app (not admin-configurable)
const TRANSCRIPTION_PROMPT =
  'Transcribe this audio recording to text. Provide only the transcription in German, no additional commentary.';

type EditingPrompt = {
  type: 'translation-de-en' | 'herkunft-de' | 'ziel-de';
  template: string;
};

export function AIPromptsManagement() {
  const utils = trpc.useUtils();
  const [editingPrompt, setEditingPrompt] = useState<EditingPrompt | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load the real prompts used by the app
  const { data: translationData, isLoading: loadingTranslation } =
    trpc.curriculumBuilder.getTranslationPrompts.useQuery();
  const { data: contextData, isLoading: loadingContext } =
    trpc.curriculumBuilder.getContextGenerationPrompts.useQuery();

  const upsertTranslation = trpc.curriculumBuilder.upsertTranslationPrompt.useMutation({
    onSuccess: () => {
      utils.curriculumBuilder.getTranslationPrompts.invalidate();
      setEditingPrompt(null);
      setSaveError(null);
    },
    onError: (e) => setSaveError(e.message),
  });

  const resetTranslation = trpc.curriculumBuilder.resetTranslationPromptToDefault.useMutation({
    onSuccess: () => utils.curriculumBuilder.getTranslationPrompts.invalidate(),
  });

  const upsertContext = trpc.curriculumBuilder.upsertContextGenerationPrompt.useMutation({
    onSuccess: () => {
      utils.curriculumBuilder.getContextGenerationPrompts.invalidate();
      setEditingPrompt(null);
      setSaveError(null);
    },
    onError: (e) => setSaveError(e.message),
  });

  const resetContext = trpc.curriculumBuilder.resetContextGenerationPromptToDefault.useMutation({
    onSuccess: () => utils.curriculumBuilder.getContextGenerationPrompts.invalidate(),
  });

  // Find the current active custom prompt, or fall back to the compiled-in default
  const getTranslationPrompt = () => {
    const custom = translationData?.customPrompts?.find(
      (p) => p.sourceLang === 'de' && p.targetLang === 'en' && p.isActive
    );
    if (custom) return { template: custom.promptTemplate, isCustom: true };
    return {
      template: translationData?.defaultPrompts?.['de-en']?.template ?? '',
      isCustom: false,
    };
  };

  const getContextPrompt = (type: 'herkunft' | 'ziel') => {
    const custom = contextData?.customPrompts?.find(
      (p) => p.contextType === type && p.language === 'de' && p.isActive
    );
    const key = `${type}-de` as 'herkunft-de' | 'ziel-de';
    if (custom) return { template: custom.promptTemplate, isCustom: true };
    return {
      template: contextData?.defaultPrompts?.[key]?.template ?? '',
      isCustom: false,
    };
  };

  const handleSave = () => {
    if (!editingPrompt) return;
    setSaveError(null);

    if (editingPrompt.type === 'translation-de-en') {
      upsertTranslation.mutate({
        sourceLang: 'de',
        targetLang: 'en',
        name: 'German to English',
        promptTemplate: editingPrompt.template,
        isActive: true,
      });
    } else if (editingPrompt.type === 'herkunft-de') {
      upsertContext.mutate({
        contextType: 'herkunft',
        language: 'de',
        name: 'Herkunft (German)',
        promptTemplate: editingPrompt.template,
        isActive: true,
      });
    } else if (editingPrompt.type === 'ziel-de') {
      upsertContext.mutate({
        contextType: 'ziel',
        language: 'de',
        name: 'Ziel (German)',
        promptTemplate: editingPrompt.template,
        isActive: true,
      });
    }
  };

  const handleReset = (type: EditingPrompt['type']) => {
    if (type === 'translation-de-en') {
      resetTranslation.mutate({ sourceLang: 'de', targetLang: 'en' });
    } else if (type === 'herkunft-de') {
      resetContext.mutate({ contextType: 'herkunft', language: 'de' });
    } else if (type === 'ziel-de') {
      resetContext.mutate({ contextType: 'ziel', language: 'de' });
    }
  };

  const isSaving = upsertTranslation.isPending || upsertContext.isPending;

  if (loadingTranslation || loadingContext) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 rounded-full border-2 border-rdy-orange-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const translation = getTranslationPrompt();
  const herkunft = getContextPrompt('herkunft');
  const ziel = getContextPrompt('ziel');

  const prompts: Array<{
    id: EditingPrompt['type'];
    title: string;
    description: string;
    hint: string;
    isCustom: boolean;
    template: string;
  }> = [
    {
      id: 'translation-de-en',
      title: 'Translation',
      description:
        'Used when translating German program content (exercises, Module, weeks) to English.',
      hint: 'Must include {{text}} placeholder.',
      isCustom: translation.isCustom,
      template: translation.template,
    },
    {
      id: 'herkunft-de',
      title: 'Herkunft Generation',
      description:
        'Used when the admin clicks "Generate Herkunft" on a Modul or exercise. Generates the background/origin text in German.',
      hint: 'Must include {{description}} placeholder. Optional: {{title}}, {{additionalContext}}.',
      isCustom: herkunft.isCustom,
      template: herkunft.template,
    },
    {
      id: 'ziel-de',
      title: 'Ziel Generation',
      description:
        'Used when the admin clicks "Generate Ziel" on a Modul or exercise. Generates the goal/purpose text in German.',
      hint: 'Must include {{description}} placeholder. Optional: {{title}}, {{additionalContext}}.',
      isCustom: ziel.isCustom,
      template: ziel.template,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-700">
          <strong>4 prompts</strong> power the AI features in this app — 3 are configurable below, 1
          is hardcoded. Edits take effect immediately across the whole tenant.
        </p>
      </div>

      {/* Editable prompts */}
      {prompts.map((prompt) => (
        <Card key={prompt.id} className="border-rdy-gray-200">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base text-rdy-black">{prompt.title}</CardTitle>
                <CardDescription className="mt-1 text-xs text-rdy-gray-400">
                  {prompt.description}
                </CardDescription>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    prompt.isCustom
                      ? 'border-rdy-orange-500 text-rdy-orange-500'
                      : 'border-rdy-gray-300 text-rdy-gray-400'
                  }
                >
                  {prompt.isCustom ? 'Custom' : 'Default'}
                </Badge>
                {prompt.isCustom && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReset(prompt.id)}
                    disabled={resetTranslation.isPending || resetContext.isPending}
                    className="text-xs text-rdy-gray-400 hover:text-red-500"
                  >
                    Reset
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSaveError(null);
                    setEditingPrompt({ type: prompt.id, template: prompt.template });
                  }}
                  className="border-rdy-gray-200 text-xs"
                >
                  Edit
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md bg-rdy-gray-100 p-3 font-mono text-xs text-rdy-gray-500">
              {prompt.template || '(empty — default will be used)'}
            </pre>
          </CardContent>
        </Card>
      ))}

      {/* Transcription — read-only */}
      <Card className="border-rdy-gray-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base text-rdy-black">Transcription</CardTitle>
              <CardDescription className="mt-1 text-xs text-rdy-gray-400">
                Used when transcribing diary voice recordings. Sent alongside the audio to the AI
                provider. This prompt is hardcoded and cannot be changed here.
              </CardDescription>
            </div>
            <Badge variant="outline" className="shrink-0 border-rdy-gray-300 text-rdy-gray-400">
              Hardcoded
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap rounded-md bg-rdy-gray-100 p-3 font-mono text-xs text-rdy-gray-400">
            {TRANSCRIPTION_PROMPT}
          </pre>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editingPrompt} onOpenChange={(open) => !open && setEditingPrompt(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Edit{' '}
              {editingPrompt?.type === 'translation-de-en'
                ? 'Translation'
                : editingPrompt?.type === 'herkunft-de'
                  ? 'Herkunft Generation'
                  : 'Ziel Generation'}{' '}
              Prompt
            </DialogTitle>
            <DialogDescription>
              {editingPrompt?.type === 'translation-de-en'
                ? 'Must include {{text}} placeholder where the text to translate will be inserted.'
                : 'Must include {{description}} placeholder. Optional: {{title}}, {{additionalContext}}.'}
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={editingPrompt?.template ?? ''}
            onChange={(e) =>
              editingPrompt &&
              setEditingPrompt({ ...editingPrompt, template: e.target.value })
            }
            rows={16}
            className="font-mono text-xs"
            placeholder="Enter prompt template..."
          />

          {saveError && <p className="text-sm text-red-500">{saveError}</p>}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingPrompt(null)}
              className="border-rdy-gray-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !editingPrompt?.template?.trim()}
              className="bg-rdy-orange-500 text-white hover:bg-rdy-orange-600"
            >
              {isSaving ? 'Saving...' : 'Save Prompt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
