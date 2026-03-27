import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { aiPrompts, aiSettings, users } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { decryptApiKey } from '@/lib/crypto/encryption';
import { ANTHROPIC_API_URL, ANTHROPIC_API_VERSION, ANTHROPIC_TEST_MODEL, GEMINI_API_BASE_URL, GEMINI_TEST_MODEL, AI_MAX_TOKENS_SHORT } from '@/lib/ai/config';

// Valid AI prompt categories
const aiPromptCategoryValues = [
  'translation',
  'context_generation',
  'summarization',
  'chat',
  'analysis',
  'transcription',
  'custom',
] as const;

// Schema for creating a new prompt
const createPromptSchema = z.object({
  promptKey: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.enum(aiPromptCategoryValues),
  promptTemplate: z.string().min(1),
  systemMessage: z.string().optional(),
  variables: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// Schema for updating a prompt
const updatePromptSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  promptTemplate: z.string().min(1).optional(),
  systemMessage: z.string().optional().nullable(),
  variables: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// Schema for testing a prompt
const testPromptSchema = z.object({
  promptTemplate: z.string().min(1),
  systemMessage: z.string().optional(),
  variables: z.record(z.string(), z.string()).optional(),
});

/**
 * Admin middleware - ensures user has admin role and extracts tenantId
 */
const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const userRoles = ctx.session.user.roles || [];

  if (!userRoles.includes('admin') && !userRoles.includes('superadmin')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }

  const [adminUser] = await ctx.db
    .select({ id: users.id, tenantId: users.tenantId })
    .from(users)
    .where(eq(users.email, ctx.session.user.email))
    .limit(1);

  if (!adminUser?.tenantId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin user must be associated with a tenant',
    });
  }

  return next({
    ctx: {
      ...ctx,
      tenantId: adminUser.tenantId,
      adminUserId: adminUser.id,
    },
  });
});

// Default system prompts that will be seeded for each tenant
export const DEFAULT_AI_PROMPTS = {
  'translation-de-en': {
    name: 'German to English Translation',
    description: 'Translates German text to English while preserving formatting and context',
    category: 'translation' as const,
    promptTemplate: `You are a professional translator specializing in wellness and personal development content.

Translate the following German text to English. Preserve the original formatting, tone, and any technical terms.

{{#if context}}
Context: {{context}}
{{/if}}

Text to translate:
{{text}}

Provide only the translated text without any explanations or additional commentary.`,
    systemMessage: 'You are a professional translator with expertise in wellness and personal development terminology.',
    variables: ['text', 'context'],
  },
  'translation-en-de': {
    name: 'English to German Translation',
    description: 'Translates English text to German while preserving formatting and context',
    category: 'translation' as const,
    promptTemplate: `Du bist ein professioneller Übersetzer mit Spezialisierung auf Wellness- und persönliche Entwicklungsinhalte.

Übersetze den folgenden englischen Text ins Deutsche. Bewahre die ursprüngliche Formatierung, den Ton und alle Fachbegriffe.

{{#if context}}
Kontext: {{context}}
{{/if}}

Zu übersetzender Text:
{{text}}

Gib nur den übersetzten Text ohne Erklärungen oder zusätzliche Kommentare an.`,
    systemMessage: 'Du bist ein professioneller Übersetzer mit Expertise in Wellness- und persönlicher Entwicklungsterminologie.',
    variables: ['text', 'context'],
  },
  'context-herkunft-de': {
    name: 'Herkunft Generation (German)',
    description: 'Generates background/origin text for curriculum items in German',
    category: 'context_generation' as const,
    promptTemplate: `Du bist ein Experte für Curriculum-Entwicklung im Bereich Wellness und persönliche Entwicklung.

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
    systemMessage: 'Du bist ein Experte für Curriculum-Entwicklung mit tiefem Wissen über Wellness-Praktiken und deren Ursprünge.',
    variables: ['title', 'description', 'additionalContext'],
  },
  'context-herkunft-en': {
    name: 'Herkunft Generation (English)',
    description: 'Generates background/origin text for curriculum items in English',
    category: 'context_generation' as const,
    promptTemplate: `You are an expert in curriculum development for wellness and personal development.

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
    systemMessage: 'You are an expert in curriculum development with deep knowledge of wellness practices and their origins.',
    variables: ['title', 'description', 'additionalContext'],
  },
  'context-ziel-de': {
    name: 'Ziel Generation (German)',
    description: 'Generates goal/purpose text for curriculum items in German',
    category: 'context_generation' as const,
    promptTemplate: `Du bist ein Experte für Curriculum-Entwicklung im Bereich Wellness und persönliche Entwicklung.

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
    systemMessage: 'Du bist ein Experte für Curriculum-Entwicklung mit Fokus auf messbare Lernergebnisse.',
    variables: ['title', 'description', 'additionalContext'],
  },
  'context-ziel-en': {
    name: 'Ziel Generation (English)',
    description: 'Generates goal/purpose text for curriculum items in English',
    category: 'context_generation' as const,
    promptTemplate: `You are an expert in curriculum development for wellness and personal development.

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
    systemMessage: 'You are an expert in curriculum development with focus on measurable learning outcomes.',
    variables: ['title', 'description', 'additionalContext'],
  },
  'summarization-session': {
    name: 'Session Summarization',
    description: 'Summarizes mentoring session notes and key takeaways',
    category: 'summarization' as const,
    promptTemplate: `You are an assistant helping to summarize mentoring session notes.

Based on the following session notes, create a concise summary that includes:
1. Key discussion points
2. Action items or homework
3. Progress noted
4. Areas for future focus

Session Notes:
{{notes}}

{{#if context}}
Additional context: {{context}}
{{/if}}

Provide a structured summary in {{language}}.`,
    systemMessage: 'You are an expert at distilling key information from coaching and mentoring sessions.',
    variables: ['notes', 'context', 'language'],
  },
  'summarization-diary': {
    name: 'Diary Entry Summarization',
    description: 'Summarizes diary entries for weekly/monthly review',
    category: 'summarization' as const,
    promptTemplate: `You are an assistant helping to summarize personal diary entries for a wellness program participant.

Summarize the following diary entries, highlighting:
1. Overall mood and emotional patterns
2. Progress towards goals
3. Challenges faced
4. Positive moments and achievements

Diary Entries:
{{entries}}

Provide an empathetic and supportive summary in {{language}}.`,
    systemMessage: 'You are a supportive assistant with expertise in wellness and personal development journaling.',
    variables: ['entries', 'language'],
  },
  'transcription-voice': {
    name: 'Voice Transcription Cleanup',
    description: 'Cleans up and formats voice transcription text',
    category: 'transcription' as const,
    promptTemplate: `You are an assistant helping to clean up voice transcription text.

The following text was transcribed from a voice recording. Please:
1. Fix any obvious transcription errors
2. Add proper punctuation
3. Format into readable paragraphs
4. Preserve the original meaning and tone

Original transcription:
{{transcription}}

Language: {{language}}

Provide the cleaned-up text without any additional commentary.`,
    systemMessage: 'You are an expert at cleaning up and formatting voice transcriptions while preserving the original meaning.',
    variables: ['transcription', 'language'],
  },
};

/**
 * AI Prompts Router
 * Handles AI prompt configuration management per tenant
 */
export const aiPromptsRouter = router({
  /**
   * Get all prompts for the current tenant
   */
  list: adminProcedure
    .input(
      z.object({
        category: z.enum(aiPromptCategoryValues).optional(),
        includeInactive: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(aiPrompts.tenantId, ctx.tenantId)];

      if (input?.category) {
        conditions.push(eq(aiPrompts.category, input.category));
      }

      if (!input?.includeInactive) {
        conditions.push(eq(aiPrompts.isActive, true));
      }

      const prompts = await ctx.db
        .select()
        .from(aiPrompts)
        .where(and(...conditions))
        .orderBy(desc(aiPrompts.category), aiPrompts.name);

      return prompts;
    }),

  /**
   * Get a single prompt by ID
   */
  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [prompt] = await ctx.db
        .select()
        .from(aiPrompts)
        .where(
          and(
            eq(aiPrompts.id, input.id),
            eq(aiPrompts.tenantId, ctx.tenantId)
          )
        )
        .limit(1);

      if (!prompt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Prompt not found',
        });
      }

      return prompt;
    }),

  /**
   * Get a prompt by its key
   */
  getByKey: adminProcedure
    .input(z.object({ promptKey: z.string() }))
    .query(async ({ ctx, input }) => {
      const [prompt] = await ctx.db
        .select()
        .from(aiPrompts)
        .where(
          and(
            eq(aiPrompts.promptKey, input.promptKey),
            eq(aiPrompts.tenantId, ctx.tenantId)
          )
        )
        .limit(1);

      if (!prompt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Prompt not found',
        });
      }

      return prompt;
    }),

  /**
   * Create a new prompt
   */
  create: adminProcedure
    .input(createPromptSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if prompt key already exists
      const [existing] = await ctx.db
        .select({ id: aiPrompts.id })
        .from(aiPrompts)
        .where(
          and(
            eq(aiPrompts.promptKey, input.promptKey),
            eq(aiPrompts.tenantId, ctx.tenantId)
          )
        )
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A prompt with this key already exists',
        });
      }

      const [newPrompt] = await ctx.db
        .insert(aiPrompts)
        .values({
          tenantId: ctx.tenantId,
          promptKey: input.promptKey,
          name: input.name,
          description: input.description || null,
          category: input.category,
          promptTemplate: input.promptTemplate,
          systemMessage: input.systemMessage || null,
          defaultPromptTemplate: input.promptTemplate,
          defaultSystemMessage: input.systemMessage || null,
          variables: input.variables || [],
          isActive: input.isActive ?? true,
          isSystem: false,
        })
        .returning();

      return newPrompt;
    }),

  /**
   * Update an existing prompt
   */
  update: adminProcedure
    .input(updatePromptSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Verify prompt exists and belongs to tenant
      const [existing] = await ctx.db
        .select()
        .from(aiPrompts)
        .where(
          and(eq(aiPrompts.id, id), eq(aiPrompts.tenantId, ctx.tenantId))
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Prompt not found',
        });
      }

      // Build update object
      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (updateData.name !== undefined) updates.name = updateData.name;
      if (updateData.description !== undefined) updates.description = updateData.description;
      if (updateData.promptTemplate !== undefined) updates.promptTemplate = updateData.promptTemplate;
      if (updateData.systemMessage !== undefined) updates.systemMessage = updateData.systemMessage;
      if (updateData.variables !== undefined) updates.variables = updateData.variables;
      if (updateData.isActive !== undefined) updates.isActive = updateData.isActive;

      const [updated] = await ctx.db
        .update(aiPrompts)
        .set(updates)
        .where(eq(aiPrompts.id, id))
        .returning();

      return updated;
    }),

  /**
   * Delete a prompt (only non-system prompts can be deleted)
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify prompt exists and belongs to tenant
      const [existing] = await ctx.db
        .select()
        .from(aiPrompts)
        .where(
          and(eq(aiPrompts.id, input.id), eq(aiPrompts.tenantId, ctx.tenantId))
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Prompt not found',
        });
      }

      if (existing.isSystem) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'System prompts cannot be deleted. You can disable them instead.',
        });
      }

      await ctx.db.delete(aiPrompts).where(eq(aiPrompts.id, input.id));

      return { success: true };
    }),

  /**
   * Reset a prompt to its default template
   */
  resetToDefault: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify prompt exists and belongs to tenant
      const [existing] = await ctx.db
        .select()
        .from(aiPrompts)
        .where(
          and(eq(aiPrompts.id, input.id), eq(aiPrompts.tenantId, ctx.tenantId))
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Prompt not found',
        });
      }

      const [updated] = await ctx.db
        .update(aiPrompts)
        .set({
          promptTemplate: existing.defaultPromptTemplate,
          systemMessage: existing.defaultSystemMessage,
          updatedAt: new Date(),
        })
        .where(eq(aiPrompts.id, input.id))
        .returning();

      return updated;
    }),

  /**
   * Toggle prompt active status
   */
  toggleActive: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify prompt exists and belongs to tenant
      const [existing] = await ctx.db
        .select()
        .from(aiPrompts)
        .where(
          and(eq(aiPrompts.id, input.id), eq(aiPrompts.tenantId, ctx.tenantId))
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Prompt not found',
        });
      }

      const [updated] = await ctx.db
        .update(aiPrompts)
        .set({
          isActive: !existing.isActive,
          updatedAt: new Date(),
        })
        .where(eq(aiPrompts.id, input.id))
        .returning();

      return updated;
    }),

  /**
   * Seed default prompts for the tenant (creates system prompts if they don't exist)
   */
  seedDefaults: adminProcedure.mutation(async ({ ctx }) => {
    const createdPrompts: typeof aiPrompts.$inferSelect[] = [];

    for (const [key, promptData] of Object.entries(DEFAULT_AI_PROMPTS)) {
      // Check if prompt already exists
      const [existing] = await ctx.db
        .select({ id: aiPrompts.id })
        .from(aiPrompts)
        .where(
          and(
            eq(aiPrompts.promptKey, key),
            eq(aiPrompts.tenantId, ctx.tenantId)
          )
        )
        .limit(1);

      if (!existing) {
        const [newPrompt] = await ctx.db
          .insert(aiPrompts)
          .values({
            tenantId: ctx.tenantId,
            promptKey: key,
            name: promptData.name,
            description: promptData.description,
            category: promptData.category,
            promptTemplate: promptData.promptTemplate,
            systemMessage: promptData.systemMessage,
            defaultPromptTemplate: promptData.promptTemplate,
            defaultSystemMessage: promptData.systemMessage,
            variables: promptData.variables,
            isActive: true,
            isSystem: true,
          })
          .returning();

        createdPrompts.push(newPrompt);
      }
    }

    return {
      success: true,
      createdCount: createdPrompts.length,
      prompts: createdPrompts,
    };
  }),

  /**
   * Test a prompt with sample data
   */
  testPrompt: adminProcedure
    .input(testPromptSchema)
    .mutation(async ({ ctx, input }) => {
      const { promptTemplate, systemMessage, variables } = input;

      // Get AI settings for the tenant
      const [settings] = await ctx.db
        .select()
        .from(aiSettings)
        .where(eq(aiSettings.tenantId, ctx.tenantId))
        .limit(1);

      if (!settings?.aiEnabled) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'AI features are not enabled for this tenant',
        });
      }

      // Get API key for the default provider
      const provider = settings.defaultProvider;
      const encryptedKey =
        provider === 'anthropic'
          ? settings.anthropicApiKeyEncrypted
          : settings.geminiApiKeyEncrypted;

      if (!encryptedKey) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `No API key configured for ${provider}`,
        });
      }

      const apiKey = decryptApiKey(encryptedKey);
      if (!apiKey) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to decrypt API key',
        });
      }

      // Replace variables in the prompt template
      let processedPrompt = promptTemplate;
      if (variables) {
        for (const [key, value] of Object.entries(variables)) {
          // Handle simple variable replacement
          processedPrompt = processedPrompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);

          // Handle conditional blocks {{#if key}}...{{/if}}
          const conditionalRegex = new RegExp(`\\{\\{#if ${key}\\}\\}([\\s\\S]*?)\\{\\{\\/if\\}\\}`, 'g');
          if (value && value.trim()) {
            processedPrompt = processedPrompt.replace(conditionalRegex, '$1');
          } else {
            processedPrompt = processedPrompt.replace(conditionalRegex, '');
          }
        }
      }

      // Remove any remaining conditional blocks for missing variables
      processedPrompt = processedPrompt.replace(/\{\{#if \w+\}\}[\s\S]*?\{\{\/if\}\}/g, '');

      // Test with the AI provider
      const startTime = Date.now();
      let result: { success: boolean; output?: string; error?: string; inputTokens?: number; outputTokens?: number };

      if (provider === 'anthropic') {
        try {
          const messages: Array<{ role: string; content: string }> = [
            { role: 'user', content: processedPrompt },
          ];

          const response = await fetch(ANTHROPIC_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': ANTHROPIC_API_VERSION,
            },
            body: JSON.stringify({
              model: ANTHROPIC_TEST_MODEL, // Use fast model for testing
              max_tokens: AI_MAX_TOKENS_SHORT,
              system: systemMessage || undefined,
              messages,
            }),
          });

          if (!response.ok) {
            const errorData = (await response.json()) as { error?: { message?: string } };
            result = {
              success: false,
              error: errorData?.error?.message || `HTTP ${response.status}`,
            };
          } else {
            const data = (await response.json()) as {
              content: Array<{ type: string; text?: string }>;
              usage: { input_tokens: number; output_tokens: number };
            };

            const output = data.content
              .filter((block) => block.type === 'text')
              .map((block) => block.text)
              .join('\n')
              .trim();

            result = {
              success: true,
              output,
              inputTokens: data.usage?.input_tokens,
              outputTokens: data.usage?.output_tokens,
            };
          }
        } catch (error) {
          result = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      } else {
        // Gemini
        try {
          const prompt = systemMessage
            ? `${systemMessage}\n\n${processedPrompt}`
            : processedPrompt;

          const response = await fetch(
            GEMINI_API_BASE_URL(GEMINI_TEST_MODEL, apiKey),
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: AI_MAX_TOKENS_SHORT },
              }),
            }
          );

          if (!response.ok) {
            const errorData = (await response.json()) as { error?: { message?: string } };
            result = {
              success: false,
              error: errorData?.error?.message || `HTTP ${response.status}`,
            };
          } else {
            const data = (await response.json()) as {
              candidates: Array<{ content: { parts: Array<{ text?: string }> } }>;
              usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number };
            };

            const output =
              data.candidates?.[0]?.content?.parts
                ?.filter((part) => part.text)
                .map((part) => part.text)
                .join('\n')
                .trim() || '';

            result = {
              success: true,
              output,
              inputTokens: data.usageMetadata?.promptTokenCount,
              outputTokens: data.usageMetadata?.candidatesTokenCount,
            };
          }
        } catch (error) {
          result = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }

      const durationMs = Date.now() - startTime;

      return {
        ...result,
        provider,
        durationMs,
        processedPrompt,
      };
    }),

  /**
   * Get available prompt categories
   */
  getCategories: adminProcedure.query(() => {
    return [
      { value: 'translation', label: 'Translation', description: 'Language translation prompts' },
      { value: 'context_generation', label: 'Context Generation', description: 'Generate Herkunft/Ziel texts' },
      { value: 'summarization', label: 'Summarization', description: 'Content summarization prompts' },
      { value: 'chat', label: 'Chat', description: 'Conversational AI prompts' },
      { value: 'analysis', label: 'Analysis', description: 'Data and text analysis prompts' },
      { value: 'transcription', label: 'Transcription', description: 'Voice transcription prompts' },
      { value: 'custom', label: 'Custom', description: 'Custom prompts for specific use cases' },
    ];
  }),
});
