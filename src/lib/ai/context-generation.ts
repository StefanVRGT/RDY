import { db } from '@/lib/db';
import { aiSettings, aiUsageLogs, contextGenerationPrompts } from '@/lib/db/schema';
import { decryptApiKey } from '@/lib/crypto/encryption';
import { eq, and } from 'drizzle-orm';

// Context generation types
export type ContextType = 'herkunft' | 'ziel';
export type ContextLanguage = 'de' | 'en';

// Result type for context generation
export interface ContextGenerationResult {
  success: boolean;
  generatedText?: string;
  contextType: ContextType;
  language: ContextLanguage;
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  durationMs?: number;
}

// Configuration for context generation request
export interface ContextGenerationConfig {
  tenantId: string;
  userId: string;
  description: string;
  contextType: ContextType;
  language: ContextLanguage;
  title?: string; // Optional title for additional context
  additionalContext?: string; // Optional additional context (e.g., "this is for a week about mindfulness")
}

// Custom prompt configuration
export interface ContextGenerationPromptConfig {
  name: string;
  promptTemplate: string;
  isDefault?: boolean;
}

// Default context generation prompts
export const DEFAULT_CONTEXT_GENERATION_PROMPTS = {
  'herkunft-de': `Du bist ein Experte für Curriculum-Entwicklung im Bereich Wellness und persönliche Entwicklung.

Basierend auf der folgenden Beschreibung, generiere einen kurzen, prägnanten "Herkunft" (Hintergrund/Ursprung) Text.
Der Text sollte erklären, woher diese Übung oder dieses Konzept stammt und welchen wissenschaftlichen oder traditionellen Hintergrund es hat.

{{#if title}}
Titel: {{title}}
{{/if}}

Beschreibung:
{{description}}

{{#if additionalContext}}
Zusätzlicher Kontext: {{additionalContext}}
{{/if}}

Generiere einen Herkunft-Text (2-4 Sätze) auf Deutsch. Antworte nur mit dem generierten Text, ohne zusätzliche Erklärungen oder Labels.`,

  'herkunft-en': `You are an expert in curriculum development for wellness and personal development.

Based on the following description, generate a concise "Herkunft" (background/origin) text.
The text should explain where this exercise or concept comes from and what scientific or traditional background it has.

{{#if title}}
Title: {{title}}
{{/if}}

Description:
{{description}}

{{#if additionalContext}}
Additional context: {{additionalContext}}
{{/if}}

Generate a Herkunft (background) text (2-4 sentences) in English. Respond only with the generated text, without any additional explanations or labels.`,

  'ziel-de': `Du bist ein Experte für Curriculum-Entwicklung im Bereich Wellness und persönliche Entwicklung.

Basierend auf der folgenden Beschreibung, generiere einen kurzen, prägnanten "Ziel" (Ziel/Absicht) Text.
Der Text sollte klar beschreiben, was der Teilnehmer durch diese Übung oder dieses Konzept erreichen wird.

{{#if title}}
Titel: {{title}}
{{/if}}

Beschreibung:
{{description}}

{{#if additionalContext}}
Zusätzlicher Kontext: {{additionalContext}}
{{/if}}

Generiere einen Ziel-Text (2-4 Sätze) auf Deutsch. Antworte nur mit dem generierten Text, ohne zusätzliche Erklärungen oder Labels.`,

  'ziel-en': `You are an expert in curriculum development for wellness and personal development.

Based on the following description, generate a concise "Ziel" (goal/purpose) text.
The text should clearly describe what the participant will achieve through this exercise or concept.

{{#if title}}
Title: {{title}}
{{/if}}

Description:
{{description}}

{{#if additionalContext}}
Additional context: {{additionalContext}}
{{/if}}

Generate a Ziel (goal) text (2-4 sentences) in English. Respond only with the generated text, without any additional explanations or labels.`,
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
 * Get custom context generation prompt for a tenant
 */
async function getContextGenerationPrompt(
  tenantId: string,
  contextType: ContextType,
  language: ContextLanguage
): Promise<string> {
  // Try to get custom prompt from database
  const [customPrompt] = await db
    .select()
    .from(contextGenerationPrompts)
    .where(
      and(
        eq(contextGenerationPrompts.tenantId, tenantId),
        eq(contextGenerationPrompts.contextType, contextType),
        eq(contextGenerationPrompts.language, language),
        eq(contextGenerationPrompts.isActive, true)
      )
    )
    .limit(1);

  if (customPrompt) {
    return customPrompt.promptTemplate;
  }

  // Fall back to default prompts
  const key = `${contextType}-${language}` as keyof typeof DEFAULT_CONTEXT_GENERATION_PROMPTS;
  return DEFAULT_CONTEXT_GENERATION_PROMPTS[key] || DEFAULT_CONTEXT_GENERATION_PROMPTS['herkunft-de'];
}

/**
 * Build the context generation prompt with variables replaced
 */
function buildPrompt(
  template: string,
  description: string,
  title?: string,
  additionalContext?: string
): string {
  let prompt = template;

  // Replace description placeholder
  prompt = prompt.replace('{{description}}', description);

  // Handle conditional title block
  if (title) {
    prompt = prompt.replace('{{#if title}}', '');
    prompt = prompt.replace('{{/if}}', '');
    prompt = prompt.replace('{{title}}', title);
  } else {
    // Remove the entire title block if no title provided
    prompt = prompt.replace(/\{\{#if title\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  // Handle conditional additionalContext block
  if (additionalContext) {
    prompt = prompt.replace('{{#if additionalContext}}', '');
    prompt = prompt.replace('{{/if}}', '');
    prompt = prompt.replace('{{additionalContext}}', additionalContext);
  } else {
    // Remove the entire additionalContext block if not provided
    prompt = prompt.replace(/\{\{#if additionalContext\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  return prompt.trim();
}

/**
 * Log AI usage for a context generation request
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
  if (provider === 'anthropic') {
    // Claude pricing: ~$3/1M input tokens, ~$15/1M output tokens (Sonnet)
    estimatedCostCents = Math.round((inputTokens * 0.3 + outputTokens * 1.5) / 1000);
  } else if (provider === 'gemini') {
    // Gemini pricing: ~$0.35/1M input tokens, ~$1.05/1M output tokens (Pro)
    estimatedCostCents = Math.round((inputTokens * 0.035 + outputTokens * 0.105) / 1000);
  }

  await db.insert(aiUsageLogs).values({
    tenantId,
    userId,
    provider,
    model,
    taskType: 'content_generation',
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
 * Generate context using Anthropic Claude
 */
async function generateWithAnthropic(
  apiKey: string,
  model: string,
  prompt: string
): Promise<Omit<ContextGenerationResult, 'contextType' | 'language'>> {
  const startTime = Date.now();

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
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
      };
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text?: string }>;
      usage: { input_tokens: number; output_tokens: number };
    };

    const generatedText = data.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    return {
      success: true,
      generatedText,
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
      totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during generation',
      durationMs,
    };
  }
}

/**
 * Generate context using Google Gemini
 */
async function generateWithGemini(
  apiKey: string,
  model: string,
  prompt: string
): Promise<Omit<ContextGenerationResult, 'contextType' | 'language'>> {
  const startTime = Date.now();

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
            maxOutputTokens: 1024,
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
      };
    }

    const data = (await response.json()) as {
      candidates: Array<{ content: { parts: Array<{ text?: string }> } }>;
      usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number; totalTokenCount: number };
    };

    const generatedText =
      data.candidates?.[0]?.content?.parts
        ?.filter((part) => part.text)
        .map((part) => part.text)
        .join('\n')
        .trim() || '';

    return {
      success: true,
      generatedText,
      inputTokens: data.usageMetadata?.promptTokenCount || 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: data.usageMetadata?.totalTokenCount || 0,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during generation',
      durationMs,
    };
  }
}

/**
 * Main context generation function - uses tenant's AI configuration
 */
export async function generateContext(config: ContextGenerationConfig): Promise<ContextGenerationResult> {
  const { tenantId, userId, description, contextType, language, title, additionalContext } = config;

  // Validate description is not empty
  if (!description || description.trim().length === 0) {
    return {
      success: false,
      error: 'Description is required for context generation',
      contextType,
      language,
    };
  }

  // Get tenant AI settings
  const aiConfig = await getTenantAIConfig(tenantId);

  if (!aiConfig) {
    return {
      success: false,
      error: 'AI settings not configured for this tenant',
      contextType,
      language,
    };
  }

  if (!aiConfig.aiEnabled) {
    return {
      success: false,
      error: 'AI features are disabled for this tenant',
      contextType,
      language,
    };
  }

  // Determine which provider and model to use
  const contentGenerationConfig = (aiConfig.modelConfig as Record<string, { provider: 'anthropic' | 'gemini'; model: string } | undefined>)?.content_generation;
  const provider = contentGenerationConfig?.provider || aiConfig.defaultProvider;
  const model =
    contentGenerationConfig?.model ||
    (provider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gemini-1.5-flash');

  // Get the API key for the selected provider
  const apiKey = provider === 'anthropic' ? aiConfig.anthropicApiKey : aiConfig.geminiApiKey;

  if (!apiKey) {
    return {
      success: false,
      error: `No API key configured for ${provider}`,
      contextType,
      language,
    };
  }

  // Get the context generation prompt (custom or default)
  const promptTemplate = await getContextGenerationPrompt(tenantId, contextType, language);
  const prompt = buildPrompt(promptTemplate, description, title, additionalContext);

  // Perform generation based on provider
  let result: Omit<ContextGenerationResult, 'contextType' | 'language'>;
  if (provider === 'anthropic') {
    result = await generateWithAnthropic(apiKey, model, prompt);
  } else {
    result = await generateWithGemini(apiKey, model, prompt);
  }

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

  return {
    ...result,
    contextType,
    language,
  };
}

/**
 * Generate both Herkunft and Ziel at once
 */
export async function generateBothContexts(
  config: Omit<ContextGenerationConfig, 'contextType'>
): Promise<{
  herkunft: ContextGenerationResult;
  ziel: ContextGenerationResult;
}> {
  const [herkunft, ziel] = await Promise.all([
    generateContext({ ...config, contextType: 'herkunft' }),
    generateContext({ ...config, contextType: 'ziel' }),
  ]);

  return { herkunft, ziel };
}

/**
 * Get all context generation prompts for a tenant
 */
export async function getContextGenerationPrompts(tenantId: string) {
  return await db
    .select()
    .from(contextGenerationPrompts)
    .where(eq(contextGenerationPrompts.tenantId, tenantId));
}

/**
 * Create or update a context generation prompt
 */
export async function upsertContextGenerationPrompt(
  tenantId: string,
  contextType: ContextType,
  language: ContextLanguage,
  name: string,
  promptTemplate: string,
  isActive: boolean = true
) {
  // Check if prompt exists
  const [existing] = await db
    .select()
    .from(contextGenerationPrompts)
    .where(
      and(
        eq(contextGenerationPrompts.tenantId, tenantId),
        eq(contextGenerationPrompts.contextType, contextType),
        eq(contextGenerationPrompts.language, language)
      )
    )
    .limit(1);

  if (existing) {
    // Update existing
    await db
      .update(contextGenerationPrompts)
      .set({
        name,
        promptTemplate,
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(contextGenerationPrompts.id, existing.id));
    return { ...existing, name, promptTemplate, isActive };
  } else {
    // Insert new
    const [newPrompt] = await db
      .insert(contextGenerationPrompts)
      .values({
        tenantId,
        contextType,
        language,
        name,
        promptTemplate,
        isActive,
      })
      .returning();
    return newPrompt;
  }
}

/**
 * Delete a context generation prompt
 */
export async function deleteContextGenerationPrompt(promptId: string, tenantId: string) {
  await db
    .delete(contextGenerationPrompts)
    .where(
      and(
        eq(contextGenerationPrompts.id, promptId),
        eq(contextGenerationPrompts.tenantId, tenantId)
      )
    );
}

/**
 * Reset a context generation prompt to default
 */
export async function resetContextGenerationPromptToDefault(
  tenantId: string,
  contextType: ContextType,
  language: ContextLanguage
) {
  // Delete custom prompt to fall back to default
  await db
    .delete(contextGenerationPrompts)
    .where(
      and(
        eq(contextGenerationPrompts.tenantId, tenantId),
        eq(contextGenerationPrompts.contextType, contextType),
        eq(contextGenerationPrompts.language, language)
      )
    );

  // Return the default prompt
  const key = `${contextType}-${language}` as keyof typeof DEFAULT_CONTEXT_GENERATION_PROMPTS;
  return DEFAULT_CONTEXT_GENERATION_PROMPTS[key] || DEFAULT_CONTEXT_GENERATION_PROMPTS['herkunft-de'];
}
