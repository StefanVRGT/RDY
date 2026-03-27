import { db } from '@/lib/db';
import { aiSettings, aiUsageLogs, translationPrompts } from '@/lib/db/schema';
import { decryptApiKey } from '@/lib/crypto/encryption';
import { eq, and } from 'drizzle-orm';
import {
  ANTHROPIC_API_URL,
  ANTHROPIC_API_VERSION,
  AI_MAX_TOKENS_DEFAULT,
  GEMINI_API_BASE_URL,
  AI_PRICING,
} from '@/lib/ai/config';

// Supported languages for translation
export type TranslationLanguage = 'de' | 'en';

// Translation result type
export interface TranslationResult {
  success: boolean;
  translatedText?: string;
  sourceLang: TranslationLanguage;
  targetLang: TranslationLanguage;
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  durationMs?: number;
}

// Configuration for translation request
export interface TranslationConfig {
  tenantId: string;
  userId: string;
  text: string;
  sourceLang: TranslationLanguage;
  targetLang: TranslationLanguage;
  context?: string; // Optional context for better translation (e.g., "curriculum content", "exercise description")
}

// Custom prompt configuration
export interface TranslationPromptConfig {
  name: string;
  promptTemplate: string;
  isDefault?: boolean;
}

// Default translation prompt templates
export const DEFAULT_TRANSLATION_PROMPTS = {
  'de-en': `Translate the following German text to English. Don't translate word by word, but rewrite with the proper meaning. Use a MECE logic and use words that 95% of the adult population would use in everyday life. Only use specific terms if they are well known and used in general population.

{{#if context}}
Context: {{context}}
{{/if}}

{{text}}

Provide only the English translation, without any additional commentary or labels.`,

  'en-de': `Übersetze den folgenden englischen Text ins Deutsche. Übersetze nicht wort-für-wort, sondern schreibe mit der richtigen Bedeutung um. Verwende eine MECE-Logik und Worte, die 95% der erwachsenen Bevölkerung im Alltag verwenden würden. Nutze nur Fachbegriffe, wenn diese allgemein bekannt sind.

{{#if context}}
Kontext: {{context}}
{{/if}}

{{text}}

Gib nur die deutsche Übersetzung an, ohne zusätzliche Erklärungen oder Kommentare.`,
};

/**
 * Get the AI settings for a tenant, including decrypted API keys
 */
async function getTenantAIConfig(tenantId: string) {
  const [settings] = await db
    .select()
    .from(aiSettings)
    .where(eq(aiSettings.tenantId, tenantId))
    .limit(1);

  if (!settings) {
    return null;
  }

  return {
    ...settings,
    anthropicApiKey: settings.anthropicApiKeyEncrypted
      ? decryptApiKey(settings.anthropicApiKeyEncrypted)
      : null,
    geminiApiKey: settings.geminiApiKeyEncrypted
      ? decryptApiKey(settings.geminiApiKeyEncrypted)
      : null,
  };
}

/**
 * Get custom translation prompt for a tenant and language pair
 */
async function getTranslationPrompt(
  tenantId: string,
  sourceLang: TranslationLanguage,
  targetLang: TranslationLanguage
): Promise<string> {
  // Try to get custom prompt from database
  const [customPrompt] = await db
    .select()
    .from(translationPrompts)
    .where(
      and(
        eq(translationPrompts.tenantId, tenantId),
        eq(translationPrompts.sourceLang, sourceLang),
        eq(translationPrompts.targetLang, targetLang),
        eq(translationPrompts.isActive, true)
      )
    )
    .limit(1);

  if (customPrompt) {
    return customPrompt.promptTemplate;
  }

  // Fall back to default prompts
  const key = `${sourceLang}-${targetLang}` as keyof typeof DEFAULT_TRANSLATION_PROMPTS;
  return DEFAULT_TRANSLATION_PROMPTS[key] || DEFAULT_TRANSLATION_PROMPTS['de-en'];
}

/**
 * Build the translation prompt with variables replaced
 */
function buildPrompt(template: string, text: string, context?: string): string {
  let prompt = template;

  // Replace text placeholder
  prompt = prompt.replace('{{text}}', text);

  // Handle conditional context block
  if (context) {
    prompt = prompt.replace('{{#if context}}', '');
    prompt = prompt.replace('{{/if}}', '');
    prompt = prompt.replace('{{context}}', context);
  } else {
    // Remove the entire context block if no context provided
    prompt = prompt.replace(/\{\{#if context\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  return prompt.trim();
}

/**
 * Log AI usage for a translation request
 */
async function logAIUsage(
  tenantId: string,
  userId: string,
  provider: 'anthropic' | 'gemini',
  model: string,
  inputTokens: number,
  outputTokens: number,
  totalTokens: number,
  durationMs: number,
  success: boolean,
  errorMessage?: string
) {
  // Estimate cost based on provider and tokens
  let estimatedCostCents = 0;
  const pricing = AI_PRICING[provider];
  if (pricing) {
    estimatedCostCents = Math.round(
      (inputTokens * pricing.inputCentsPerMToken + outputTokens * pricing.outputCentsPerMToken) / 1000
    );
  }

  await db.insert(aiUsageLogs).values({
    tenantId,
    userId,
    provider,
    model,
    taskType: 'translation',
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCostCents,
    durationMs,
    success,
    errorMessage: errorMessage || null,
  });
}

/**
 * Translate text using Anthropic Claude
 */
async function translateWithAnthropic(
  apiKey: string,
  model: string,
  prompt: string
): Promise<TranslationResult & { sourceLang: TranslationLanguage; targetLang: TranslationLanguage }> {
  const startTime = Date.now();

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_API_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: AI_MAX_TOKENS_DEFAULT,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        (errorData as { error?: { message?: string } })?.error?.message ||
        `HTTP ${response.status}`;
      return {
        success: false,
        error: `Anthropic API error: ${errorMessage}`,
        durationMs,
        sourceLang: 'de',
        targetLang: 'en',
      };
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text?: string }>;
      usage: { input_tokens: number; output_tokens: number };
    };

    const translatedText = data.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    return {
      success: true,
      translatedText,
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
      totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      durationMs,
      sourceLang: 'de',
      targetLang: 'en',
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during translation',
      durationMs,
      sourceLang: 'de',
      targetLang: 'en',
    };
  }
}

/**
 * Translate text using Google Gemini
 */
async function translateWithGemini(
  apiKey: string,
  model: string,
  prompt: string
): Promise<TranslationResult & { sourceLang: TranslationLanguage; targetLang: TranslationLanguage }> {
  const startTime = Date.now();

  try {
    const response = await fetch(
      GEMINI_API_BASE_URL(model, apiKey),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: AI_MAX_TOKENS_DEFAULT,
          },
        }),
      }
    );

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        (errorData as { error?: { message?: string } })?.error?.message ||
        `HTTP ${response.status}`;
      return {
        success: false,
        error: `Gemini API error: ${errorMessage}`,
        durationMs,
        sourceLang: 'de',
        targetLang: 'en',
      };
    }

    const data = (await response.json()) as {
      candidates: Array<{ content: { parts: Array<{ text?: string }> } }>;
      usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number; totalTokenCount: number };
    };

    const translatedText =
      data.candidates?.[0]?.content?.parts
        ?.filter((part) => part.text)
        .map((part) => part.text)
        .join('\n')
        .trim() || '';

    return {
      success: true,
      translatedText,
      inputTokens: data.usageMetadata?.promptTokenCount || 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: data.usageMetadata?.totalTokenCount || 0,
      durationMs,
      sourceLang: 'de',
      targetLang: 'en',
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during translation',
      durationMs,
      sourceLang: 'de',
      targetLang: 'en',
    };
  }
}

/**
 * Main translation function - uses tenant's AI configuration
 */
export async function translateText(config: TranslationConfig): Promise<TranslationResult> {
  const { tenantId, userId, text, sourceLang, targetLang, context } = config;

  // Validate languages are different
  if (sourceLang === targetLang) {
    return {
      success: false,
      error: 'Source and target languages must be different',
      sourceLang,
      targetLang,
    };
  }

  // Get tenant AI settings
  const aiConfig = await getTenantAIConfig(tenantId);

  if (!aiConfig) {
    return {
      success: false,
      error: 'AI settings not configured for this tenant',
      sourceLang,
      targetLang,
    };
  }

  if (!aiConfig.aiEnabled) {
    return {
      success: false,
      error: 'AI features are disabled for this tenant',
      sourceLang,
      targetLang,
    };
  }

  // Determine which provider and model to use
  const translationConfig = (aiConfig.modelConfig as Record<string, { provider: 'anthropic' | 'gemini'; model: string } | undefined>)?.translation;
  const provider = translationConfig?.provider || aiConfig.defaultProvider;
  const model =
    translationConfig?.model ||
    (provider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gemini-1.5-flash');

  // Get the API key for the selected provider
  const apiKey = provider === 'anthropic' ? aiConfig.anthropicApiKey : aiConfig.geminiApiKey;

  if (!apiKey) {
    return {
      success: false,
      error: `No API key configured for ${provider}`,
      sourceLang,
      targetLang,
    };
  }

  // Get the translation prompt (custom or default)
  const promptTemplate = await getTranslationPrompt(tenantId, sourceLang, targetLang);
  const prompt = buildPrompt(promptTemplate, text, context);

  // Perform translation based on provider
  let result: TranslationResult;
  if (provider === 'anthropic') {
    result = await translateWithAnthropic(apiKey, model, prompt);
  } else {
    result = await translateWithGemini(apiKey, model, prompt);
  }

  // Set the correct source and target languages
  result.sourceLang = sourceLang;
  result.targetLang = targetLang;

  // Log the usage
  await logAIUsage(
    tenantId,
    userId,
    provider,
    model,
    result.inputTokens || 0,
    result.outputTokens || 0,
    result.totalTokens || 0,
    result.durationMs || 0,
    result.success,
    result.error
  );

  return result;
}

/**
 * Get all translation prompts for a tenant
 */
export async function getTranslationPrompts(tenantId: string) {
  return await db
    .select()
    .from(translationPrompts)
    .where(eq(translationPrompts.tenantId, tenantId));
}

/**
 * Create or update a translation prompt
 */
export async function upsertTranslationPrompt(
  tenantId: string,
  sourceLang: TranslationLanguage,
  targetLang: TranslationLanguage,
  name: string,
  promptTemplate: string,
  isActive: boolean = true
) {
  // Check if prompt exists
  const [existing] = await db
    .select()
    .from(translationPrompts)
    .where(
      and(
        eq(translationPrompts.tenantId, tenantId),
        eq(translationPrompts.sourceLang, sourceLang),
        eq(translationPrompts.targetLang, targetLang)
      )
    )
    .limit(1);

  if (existing) {
    // Update existing
    await db
      .update(translationPrompts)
      .set({
        name,
        promptTemplate,
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(translationPrompts.id, existing.id));
    return { ...existing, name, promptTemplate, isActive };
  } else {
    // Insert new
    const [newPrompt] = await db
      .insert(translationPrompts)
      .values({
        tenantId,
        sourceLang,
        targetLang,
        name,
        promptTemplate,
        isActive,
      })
      .returning();
    return newPrompt;
  }
}

/**
 * Delete a translation prompt
 */
export async function deleteTranslationPrompt(promptId: string, tenantId: string) {
  await db
    .delete(translationPrompts)
    .where(
      and(
        eq(translationPrompts.id, promptId),
        eq(translationPrompts.tenantId, tenantId)
      )
    );
}

/**
 * Reset a translation prompt to default
 */
export async function resetTranslationPromptToDefault(
  tenantId: string,
  sourceLang: TranslationLanguage,
  targetLang: TranslationLanguage
) {
  // Delete custom prompt to fall back to default
  await db
    .delete(translationPrompts)
    .where(
      and(
        eq(translationPrompts.tenantId, tenantId),
        eq(translationPrompts.sourceLang, sourceLang),
        eq(translationPrompts.targetLang, targetLang)
      )
    );

  // Return the default prompt
  const key = `${sourceLang}-${targetLang}` as keyof typeof DEFAULT_TRANSLATION_PROMPTS;
  return DEFAULT_TRANSLATION_PROMPTS[key] || DEFAULT_TRANSLATION_PROMPTS['de-en'];
}
