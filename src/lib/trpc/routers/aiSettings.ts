import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { aiSettings, aiUsageLogs, users } from '@/lib/db/schema';
import { eq, and, gte, desc, sql, count } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { encryptApiKey, decryptApiKey, maskApiKey } from '@/lib/crypto/encryption';
import { ANTHROPIC_API_URL, ANTHROPIC_API_VERSION, ANTHROPIC_TEST_MODEL, GEMINI_API_BASE_URL, GEMINI_TEST_MODEL, AI_MAX_TOKENS_PING } from '@/lib/ai/config';

// Valid AI providers
const aiProviderValues = ['anthropic', 'gemini'] as const;

// Valid AI task types
const aiTaskTypeValues = ['chat', 'summarization', 'translation', 'content_generation', 'analysis', 'transcription'] as const;

// Model configuration schema for a single task
const taskModelConfigSchema = z.object({
  provider: z.enum(aiProviderValues),
  model: z.string().min(1),
});

// Full model configuration schema
const modelConfigSchema = z.object({
  chat: taskModelConfigSchema.optional(),
  summarization: taskModelConfigSchema.optional(),
  translation: taskModelConfigSchema.optional(),
  content_generation: taskModelConfigSchema.optional(),
  analysis: taskModelConfigSchema.optional(),
  transcription: taskModelConfigSchema.optional(),
});

// Schema for updating AI settings
const updateAISettingsSchema = z.object({
  defaultProvider: z.enum(aiProviderValues).optional(),
  anthropicApiKey: z.string().optional().nullable(),
  geminiApiKey: z.string().optional().nullable(),
  modelConfig: modelConfigSchema.optional(),
  aiEnabled: z.boolean().optional(),
});

// Schema for updating a specific model config
const updateModelConfigSchema = z.object({
  taskType: z.enum(aiTaskTypeValues),
  provider: z.enum(aiProviderValues),
  model: z.string().min(1),
});

// Schema for removing a model config
const removeModelConfigSchema = z.object({
  taskType: z.enum(aiTaskTypeValues),
});

// Schema for testing API key
const testApiKeySchema = z.object({
  provider: z.enum(aiProviderValues),
  apiKey: z.string().min(1),
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

/**
 * AI Settings Router
 * Handles AI configuration management per tenant
 */
export const aiSettingsRouter = router({
  /**
   * Get current tenant's AI settings
   * Creates default settings if none exist
   */
  getSettings: adminProcedure.query(async ({ ctx }) => {
    // Try to get existing settings
    const [existingSettings] = await ctx.db
      .select()
      .from(aiSettings)
      .where(eq(aiSettings.tenantId, ctx.tenantId))
      .limit(1);

    if (existingSettings) {
      // Return settings with masked API keys
      return {
        id: existingSettings.id,
        tenantId: existingSettings.tenantId,
        defaultProvider: existingSettings.defaultProvider,
        hasAnthropicKey: !!existingSettings.anthropicApiKeyEncrypted,
        hasGeminiKey: !!existingSettings.geminiApiKeyEncrypted,
        anthropicApiKeyMasked: existingSettings.anthropicApiKeyEncrypted
          ? maskApiKey(decryptApiKey(existingSettings.anthropicApiKeyEncrypted))
          : null,
        geminiApiKeyMasked: existingSettings.geminiApiKeyEncrypted
          ? maskApiKey(decryptApiKey(existingSettings.geminiApiKeyEncrypted))
          : null,
        modelConfig: existingSettings.modelConfig,
        aiEnabled: existingSettings.aiEnabled,
        createdAt: existingSettings.createdAt,
        updatedAt: existingSettings.updatedAt,
      };
    }

    // Create default settings if none exist
    const [newSettings] = await ctx.db
      .insert(aiSettings)
      .values({
        tenantId: ctx.tenantId,
        defaultProvider: 'anthropic',
        modelConfig: {},
        aiEnabled: false,
      })
      .returning();

    return {
      id: newSettings.id,
      tenantId: newSettings.tenantId,
      defaultProvider: newSettings.defaultProvider,
      hasAnthropicKey: false,
      hasGeminiKey: false,
      anthropicApiKeyMasked: null,
      geminiApiKeyMasked: null,
      modelConfig: newSettings.modelConfig,
      aiEnabled: newSettings.aiEnabled,
      createdAt: newSettings.createdAt,
      updatedAt: newSettings.updatedAt,
    };
  }),

  /**
   * Update AI settings
   */
  updateSettings: adminProcedure
    .input(updateAISettingsSchema)
    .mutation(async ({ ctx, input }) => {
      // Build update object
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.defaultProvider !== undefined) {
        updateData.defaultProvider = input.defaultProvider;
      }

      if (input.anthropicApiKey !== undefined) {
        updateData.anthropicApiKeyEncrypted = input.anthropicApiKey
          ? encryptApiKey(input.anthropicApiKey)
          : null;
      }

      if (input.geminiApiKey !== undefined) {
        updateData.geminiApiKeyEncrypted = input.geminiApiKey
          ? encryptApiKey(input.geminiApiKey)
          : null;
      }

      if (input.modelConfig !== undefined) {
        updateData.modelConfig = input.modelConfig;
      }

      if (input.aiEnabled !== undefined) {
        updateData.aiEnabled = input.aiEnabled;
      }

      // Check if settings exist
      const [existingSettings] = await ctx.db
        .select({ id: aiSettings.id })
        .from(aiSettings)
        .where(eq(aiSettings.tenantId, ctx.tenantId))
        .limit(1);

      let settings;
      if (existingSettings) {
        // Update existing settings
        [settings] = await ctx.db
          .update(aiSettings)
          .set(updateData)
          .where(eq(aiSettings.tenantId, ctx.tenantId))
          .returning();
      } else {
        // Create new settings with provided values
        [settings] = await ctx.db
          .insert(aiSettings)
          .values({
            tenantId: ctx.tenantId,
            defaultProvider: input.defaultProvider ?? 'anthropic',
            anthropicApiKeyEncrypted: input.anthropicApiKey
              ? encryptApiKey(input.anthropicApiKey)
              : null,
            geminiApiKeyEncrypted: input.geminiApiKey
              ? encryptApiKey(input.geminiApiKey)
              : null,
            modelConfig: input.modelConfig ?? {},
            aiEnabled: input.aiEnabled ?? false,
          })
          .returning();
      }

      return {
        id: settings.id,
        tenantId: settings.tenantId,
        defaultProvider: settings.defaultProvider,
        hasAnthropicKey: !!settings.anthropicApiKeyEncrypted,
        hasGeminiKey: !!settings.geminiApiKeyEncrypted,
        anthropicApiKeyMasked: settings.anthropicApiKeyEncrypted
          ? maskApiKey(decryptApiKey(settings.anthropicApiKeyEncrypted))
          : null,
        geminiApiKeyMasked: settings.geminiApiKeyEncrypted
          ? maskApiKey(decryptApiKey(settings.geminiApiKeyEncrypted))
          : null,
        modelConfig: settings.modelConfig,
        aiEnabled: settings.aiEnabled,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      };
    }),

  /**
   * Update model configuration for a specific task type
   */
  updateModelConfig: adminProcedure
    .input(updateModelConfigSchema)
    .mutation(async ({ ctx, input }) => {
      const { taskType, provider, model } = input;

      // Get current settings
      let [existingSettings] = await ctx.db
        .select()
        .from(aiSettings)
        .where(eq(aiSettings.tenantId, ctx.tenantId))
        .limit(1);

      if (!existingSettings) {
        // Create default settings first
        [existingSettings] = await ctx.db
          .insert(aiSettings)
          .values({
            tenantId: ctx.tenantId,
            defaultProvider: 'anthropic',
            modelConfig: {},
            aiEnabled: false,
          })
          .returning();
      }

      // Update model config
      const currentConfig = (existingSettings.modelConfig || {}) as Record<string, unknown>;
      const newConfig = {
        ...currentConfig,
        [taskType]: { provider, model },
      };

      const [updated] = await ctx.db
        .update(aiSettings)
        .set({
          modelConfig: newConfig,
          updatedAt: new Date(),
        })
        .where(eq(aiSettings.tenantId, ctx.tenantId))
        .returning();

      return {
        success: true,
        taskType,
        config: { provider, model },
        modelConfig: updated.modelConfig,
      };
    }),

  /**
   * Remove model configuration for a specific task type
   */
  removeModelConfig: adminProcedure
    .input(removeModelConfigSchema)
    .mutation(async ({ ctx, input }) => {
      const { taskType } = input;

      // Get current settings
      const [existingSettings] = await ctx.db
        .select()
        .from(aiSettings)
        .where(eq(aiSettings.tenantId, ctx.tenantId))
        .limit(1);

      if (!existingSettings) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'AI settings not found',
        });
      }

      // Remove task type from config
      const currentConfig = (existingSettings.modelConfig || {}) as Record<string, unknown>;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [taskType]: _, ...newConfig } = currentConfig;

      const [updated] = await ctx.db
        .update(aiSettings)
        .set({
          modelConfig: newConfig,
          updatedAt: new Date(),
        })
        .where(eq(aiSettings.tenantId, ctx.tenantId))
        .returning();

      return {
        success: true,
        taskType,
        modelConfig: updated.modelConfig,
      };
    }),

  /**
   * Toggle AI enabled status
   */
  toggleEnabled: adminProcedure.mutation(async ({ ctx }) => {
    // Get current settings
    let [existingSettings] = await ctx.db
      .select()
      .from(aiSettings)
      .where(eq(aiSettings.tenantId, ctx.tenantId))
      .limit(1);

    if (!existingSettings) {
      // Create default settings first
      [existingSettings] = await ctx.db
        .insert(aiSettings)
        .values({
          tenantId: ctx.tenantId,
          defaultProvider: 'anthropic',
          modelConfig: {},
          aiEnabled: true, // Enable by default when toggling on fresh settings
        })
        .returning();

      return {
        success: true,
        aiEnabled: existingSettings.aiEnabled,
      };
    }

    // Toggle the status
    const [updated] = await ctx.db
      .update(aiSettings)
      .set({
        aiEnabled: !existingSettings.aiEnabled,
        updatedAt: new Date(),
      })
      .where(eq(aiSettings.tenantId, ctx.tenantId))
      .returning();

    return {
      success: true,
      aiEnabled: updated.aiEnabled,
    };
  }),

  /**
   * Delete API key for a specific provider
   */
  deleteApiKey: adminProcedure
    .input(z.object({ provider: z.enum(aiProviderValues) }))
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.provider === 'anthropic') {
        updateData.anthropicApiKeyEncrypted = null;
      } else {
        updateData.geminiApiKeyEncrypted = null;
      }

      await ctx.db
        .update(aiSettings)
        .set(updateData)
        .where(eq(aiSettings.tenantId, ctx.tenantId));

      return {
        success: true,
        provider: input.provider,
      };
    }),

  /**
   * Get available models for a provider
   * This returns a static list of commonly used models
   */
  getAvailableModels: adminProcedure
    .input(z.object({ provider: z.enum(aiProviderValues) }))
    .query(({ input }) => {
      const models = {
        anthropic: [
          { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Best balance of speed and capability' },
          { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most capable, best for complex tasks' },
          { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fastest, best for simple tasks' },
        ],
        gemini: [
          { id: 'gemini-2.5-flash-preview-04-17', name: 'Gemini 2.5 Flash', description: 'Latest fast model — best balance of speed and capability' },
          { id: 'gemini-2.5-pro-preview-03-25', name: 'Gemini 2.5 Pro', description: 'Most capable Gemini model for complex tasks' },
          { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Previous generation fast model' },
        ],
      };

      return models[input.provider];
    }),

  /**
   * Test API key validity by making a real API call
   */
  testApiKey: adminProcedure
    .input(testApiKeySchema)
    .mutation(async ({ input }) => {
      const { provider, apiKey } = input;

      // Basic format validation first
      if (provider === 'anthropic') {
        if (!apiKey.startsWith('sk-ant-')) {
          return {
            valid: false,
            message: 'Invalid Anthropic API key format. Keys should start with "sk-ant-"',
          };
        }

        // Test actual API connection to Anthropic
        try {
          const response = await fetch(ANTHROPIC_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': ANTHROPIC_API_VERSION,
            },
            body: JSON.stringify({
              model: ANTHROPIC_TEST_MODEL,
              max_tokens: AI_MAX_TOKENS_PING,
              messages: [{ role: 'user', content: 'Hi' }],
            }),
          });

          if (response.ok) {
            return {
              valid: true,
              message: 'API key is valid. Connection to Anthropic successful.',
            };
          }

          const errorData = await response.json().catch(() => ({}));
          const errorMessage = (errorData as { error?: { message?: string } })?.error?.message || 'Unknown error';

          if (response.status === 401) {
            return {
              valid: false,
              message: 'Invalid API key. Authentication failed.',
            };
          }

          return {
            valid: false,
            message: `API test failed: ${errorMessage}`,
          };
        } catch (error) {
          return {
            valid: false,
            message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      } else if (provider === 'gemini') {
        if (apiKey.length < 30) {
          return {
            valid: false,
            message: 'Invalid Gemini API key format. Key appears too short.',
          };
        }

        // Test actual API connection to Gemini
        try {
          const response = await fetch(
            GEMINI_API_BASE_URL(GEMINI_TEST_MODEL, apiKey),
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contents: [{ parts: [{ text: 'Hi' }] }],
                generationConfig: { maxOutputTokens: AI_MAX_TOKENS_PING },
              }),
            }
          );

          if (response.ok) {
            return {
              valid: true,
              message: 'API key is valid. Connection to Gemini successful.',
            };
          }

          const errorData = await response.json().catch(() => ({}));
          const errorMessage = (errorData as { error?: { message?: string } })?.error?.message || 'Unknown error';

          if (response.status === 400 || response.status === 401 || response.status === 403) {
            return {
              valid: false,
              message: `Invalid API key: ${errorMessage}`,
            };
          }

          return {
            valid: false,
            message: `API test failed: ${errorMessage}`,
          };
        } catch (error) {
          return {
            valid: false,
            message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      }

      return {
        valid: false,
        message: 'Unknown provider',
      };
    }),

  /**
   * Test stored API key for a provider
   */
  testStoredApiKey: adminProcedure
    .input(z.object({ provider: z.enum(aiProviderValues) }))
    .mutation(async ({ ctx, input }) => {
      const { provider } = input;

      // Get current settings
      const [existingSettings] = await ctx.db
        .select()
        .from(aiSettings)
        .where(eq(aiSettings.tenantId, ctx.tenantId))
        .limit(1);

      if (!existingSettings) {
        return {
          valid: false,
          message: 'No AI settings configured',
        };
      }

      // Get the encrypted key
      const encryptedKey = provider === 'anthropic'
        ? existingSettings.anthropicApiKeyEncrypted
        : existingSettings.geminiApiKeyEncrypted;

      if (!encryptedKey) {
        return {
          valid: false,
          message: `No ${provider === 'anthropic' ? 'Anthropic' : 'Gemini'} API key configured`,
        };
      }

      // Decrypt the key
      const apiKey = decryptApiKey(encryptedKey);
      if (!apiKey) {
        return {
          valid: false,
          message: 'Failed to decrypt API key',
        };
      }

      // Test the API key using the existing testApiKey logic
      if (provider === 'anthropic') {
        try {
          const response = await fetch(ANTHROPIC_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': ANTHROPIC_API_VERSION,
            },
            body: JSON.stringify({
              model: ANTHROPIC_TEST_MODEL,
              max_tokens: AI_MAX_TOKENS_PING,
              messages: [{ role: 'user', content: 'Hi' }],
            }),
          });

          if (response.ok) {
            return { valid: true, message: 'Connection successful.' };
          }

          const errorData = await response.json().catch(() => ({}));
          const errorMessage = (errorData as { error?: { message?: string } })?.error?.message || 'Unknown error';
          return { valid: false, message: errorMessage };
        } catch (error) {
          return {
            valid: false,
            message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      } else {
        try {
          const response = await fetch(
            GEMINI_API_BASE_URL(GEMINI_TEST_MODEL, apiKey),
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: 'Hi' }] }],
                generationConfig: { maxOutputTokens: AI_MAX_TOKENS_PING },
              }),
            }
          );

          if (response.ok) {
            return { valid: true, message: 'Connection successful.' };
          }

          const errorData = await response.json().catch(() => ({}));
          const errorMessage = (errorData as { error?: { message?: string } })?.error?.message || 'Unknown error';
          return { valid: false, message: errorMessage };
        } catch (error) {
          return {
            valid: false,
            message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      }
    }),

  /**
   * Get usage statistics for the tenant
   */
  getUsageStatistics: adminProcedure
    .input(z.object({
      days: z.number().min(1).max(365).default(30),
    }).optional())
    .query(async ({ ctx, input }) => {
      const days = input?.days ?? 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get total counts and tokens by provider
      const byProvider = await ctx.db
        .select({
          provider: aiUsageLogs.provider,
          totalRequests: count(),
          totalInputTokens: sql<number>`sum(${aiUsageLogs.inputTokens})`.mapWith(Number),
          totalOutputTokens: sql<number>`sum(${aiUsageLogs.outputTokens})`.mapWith(Number),
          totalTokens: sql<number>`sum(${aiUsageLogs.totalTokens})`.mapWith(Number),
          totalCostCents: sql<number>`sum(${aiUsageLogs.estimatedCostCents})`.mapWith(Number),
          successCount: sql<number>`sum(case when ${aiUsageLogs.success} then 1 else 0 end)`.mapWith(Number),
          failureCount: sql<number>`sum(case when not ${aiUsageLogs.success} then 1 else 0 end)`.mapWith(Number),
        })
        .from(aiUsageLogs)
        .where(
          and(
            eq(aiUsageLogs.tenantId, ctx.tenantId),
            gte(aiUsageLogs.createdAt, startDate)
          )
        )
        .groupBy(aiUsageLogs.provider);

      // Get counts by task type
      const byTaskType = await ctx.db
        .select({
          taskType: aiUsageLogs.taskType,
          totalRequests: count(),
          totalTokens: sql<number>`sum(${aiUsageLogs.totalTokens})`.mapWith(Number),
          totalCostCents: sql<number>`sum(${aiUsageLogs.estimatedCostCents})`.mapWith(Number),
        })
        .from(aiUsageLogs)
        .where(
          and(
            eq(aiUsageLogs.tenantId, ctx.tenantId),
            gte(aiUsageLogs.createdAt, startDate)
          )
        )
        .groupBy(aiUsageLogs.taskType);

      // Get daily usage for chart
      const dailyUsage = await ctx.db
        .select({
          date: sql<string>`date(${aiUsageLogs.createdAt})`.as('date'),
          totalRequests: count(),
          totalTokens: sql<number>`sum(${aiUsageLogs.totalTokens})`.mapWith(Number),
          totalCostCents: sql<number>`sum(${aiUsageLogs.estimatedCostCents})`.mapWith(Number),
        })
        .from(aiUsageLogs)
        .where(
          and(
            eq(aiUsageLogs.tenantId, ctx.tenantId),
            gte(aiUsageLogs.createdAt, startDate)
          )
        )
        .groupBy(sql`date(${aiUsageLogs.createdAt})`)
        .orderBy(sql`date(${aiUsageLogs.createdAt})`);

      // Get recent requests
      const recentRequests = await ctx.db
        .select({
          id: aiUsageLogs.id,
          provider: aiUsageLogs.provider,
          model: aiUsageLogs.model,
          taskType: aiUsageLogs.taskType,
          totalTokens: aiUsageLogs.totalTokens,
          estimatedCostCents: aiUsageLogs.estimatedCostCents,
          success: aiUsageLogs.success,
          createdAt: aiUsageLogs.createdAt,
        })
        .from(aiUsageLogs)
        .where(eq(aiUsageLogs.tenantId, ctx.tenantId))
        .orderBy(desc(aiUsageLogs.createdAt))
        .limit(10);

      // Calculate totals
      const totals = byProvider.reduce(
        (acc, curr) => ({
          totalRequests: acc.totalRequests + Number(curr.totalRequests),
          totalInputTokens: acc.totalInputTokens + (curr.totalInputTokens || 0),
          totalOutputTokens: acc.totalOutputTokens + (curr.totalOutputTokens || 0),
          totalTokens: acc.totalTokens + (curr.totalTokens || 0),
          totalCostCents: acc.totalCostCents + (curr.totalCostCents || 0),
          successCount: acc.successCount + (curr.successCount || 0),
          failureCount: acc.failureCount + (curr.failureCount || 0),
        }),
        {
          totalRequests: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalTokens: 0,
          totalCostCents: 0,
          successCount: 0,
          failureCount: 0,
        }
      );

      return {
        period: {
          days,
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
        },
        totals,
        byProvider,
        byTaskType,
        dailyUsage,
        recentRequests,
      };
    }),
});
