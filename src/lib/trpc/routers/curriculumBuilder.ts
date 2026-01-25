import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { schwerpunktebenen, weeks, exercises, weekExercises, users } from '@/lib/db/schema';
import { eq, and, asc, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import {
  translateText,
  getTranslationPrompts,
  upsertTranslationPrompt,
  deleteTranslationPrompt,
  resetTranslationPromptToDefault,
  DEFAULT_TRANSLATION_PROMPTS,
} from '@/lib/ai/translation';
import {
  generateContext,
  generateBothContexts,
  getContextGenerationPrompts,
  upsertContextGenerationPrompt,
  deleteContextGenerationPrompt,
  resetContextGenerationPromptToDefault,
  DEFAULT_CONTEXT_GENERATION_PROMPTS,
} from '@/lib/ai/context-generation';

// Input validation schemas
const reorderSchwerpunktebenenSchema = z.object({
  schwerpunktebeneIds: z.array(z.string().uuid()).min(1),
});

const reorderWeeksSchema = z.object({
  schwerpunktebeneId: z.string().uuid(),
  weekIds: z.array(z.string().uuid()).min(1),
});

const reorderExercisesSchema = z.object({
  weekId: z.string().uuid(),
  weekExerciseIds: z.array(z.string().uuid()).min(1),
});

const updateExerciseObligatorySchema = z.object({
  weekExerciseId: z.string().uuid(),
  isObligatory: z.boolean(),
});

const translateTextSchema = z.object({
  text: z.string().min(1),
  sourceLang: z.enum(['de', 'en']),
  targetLang: z.enum(['de', 'en']),
});

/**
 * Admin middleware - ensures user has admin role and extracts tenantId
 */
const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const userRoles = ctx.session.user.roles || [];

  if (userRoles.includes('superadmin') && !userRoles.includes('admin')) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Superadmins must use the superadmin interface',
    });
  }

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

export const curriculumBuilderRouter = router({
  /**
   * Get the full curriculum hierarchy: Schwerpunktebenen > Weeks > Exercises
   */
  getFullCurriculum: adminProcedure.query(async ({ ctx }) => {
    // Fetch all schwerpunktebenen for the tenant
    const schwerpunktebenenList = await ctx.db
      .select()
      .from(schwerpunktebenen)
      .where(eq(schwerpunktebenen.tenantId, ctx.tenantId))
      .orderBy(asc(schwerpunktebenen.monthNumber));

    if (schwerpunktebenenList.length === 0) {
      return { curriculum: [] };
    }

    // Fetch all weeks for these schwerpunktebenen
    const schwerpunktebeneIds = schwerpunktebenenList.map((s) => s.id);
    const weeksList = await ctx.db
      .select()
      .from(weeks)
      .where(inArray(weeks.schwerpunktebeneId, schwerpunktebeneIds))
      .orderBy(asc(weeks.orderIndex));

    // Fetch all week exercises with their exercise data
    const weekIds = weeksList.map((w) => w.id);
    let weekExercisesList: Array<{
      weekExercise: typeof weekExercises.$inferSelect;
      exercise: typeof exercises.$inferSelect;
    }> = [];

    if (weekIds.length > 0) {
      weekExercisesList = await ctx.db
        .select({
          weekExercise: weekExercises,
          exercise: exercises,
        })
        .from(weekExercises)
        .innerJoin(exercises, eq(weekExercises.exerciseId, exercises.id))
        .where(inArray(weekExercises.weekId, weekIds))
        .orderBy(asc(weekExercises.orderIndex));
    }

    // Build the hierarchical structure
    const curriculum = schwerpunktebenenList.map((schwerpunktebene) => {
      const schwerpunktebeneWeeks = weeksList
        .filter((w) => w.schwerpunktebeneId === schwerpunktebene.id)
        .map((week) => {
          const weekExercisesData = weekExercisesList
            .filter((we) => we.weekExercise.weekId === week.id)
            .map((we) => ({
              id: we.weekExercise.id,
              exerciseId: we.exercise.id,
              orderIndex: we.weekExercise.orderIndex,
              isObligatory: we.weekExercise.isObligatory,
              frequency: we.weekExercise.frequency,
              customFrequency: we.weekExercise.customFrequency,
              exercise: we.exercise,
            }));

          return {
            ...week,
            exercises: weekExercisesData,
          };
        });

      return {
        ...schwerpunktebene,
        weeks: schwerpunktebeneWeeks,
      };
    });

    return { curriculum };
  }),

  /**
   * Reorder schwerpunktebenen (update month numbers based on new order)
   */
  reorderSchwerpunktebenen: adminProcedure
    .input(reorderSchwerpunktebenenSchema)
    .mutation(async ({ ctx, input }) => {
      const { schwerpunktebeneIds } = input;

      // Verify all schwerpunktebene IDs belong to tenant
      const existingList = await ctx.db
        .select()
        .from(schwerpunktebenen)
        .where(
          and(
            eq(schwerpunktebenen.tenantId, ctx.tenantId),
            inArray(schwerpunktebenen.id, schwerpunktebeneIds)
          )
        );

      if (existingList.length !== schwerpunktebeneIds.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Some schwerpunktebene IDs do not belong to this tenant',
        });
      }

      // Update month numbers based on new order (1, 2, 3)
      await Promise.all(
        schwerpunktebeneIds.map((id, index) =>
          ctx.db
            .update(schwerpunktebenen)
            .set({
              monthNumber: String(index + 1) as '1' | '2' | '3',
              updatedAt: new Date(),
            })
            .where(eq(schwerpunktebenen.id, id))
        )
      );

      return { success: true };
    }),

  /**
   * Reorder weeks within a schwerpunktebene
   */
  reorderWeeks: adminProcedure.input(reorderWeeksSchema).mutation(async ({ ctx, input }) => {
    const { schwerpunktebeneId, weekIds } = input;

    // Verify schwerpunktebene belongs to tenant
    const [schwerpunktebene] = await ctx.db
      .select()
      .from(schwerpunktebenen)
      .where(
        and(
          eq(schwerpunktebenen.id, schwerpunktebeneId),
          eq(schwerpunktebenen.tenantId, ctx.tenantId)
        )
      )
      .limit(1);

    if (!schwerpunktebene) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Schwerpunktebene not found' });
    }

    // Verify all week IDs belong to this schwerpunktebene
    const existingWeeks = await ctx.db
      .select()
      .from(weeks)
      .where(and(eq(weeks.schwerpunktebeneId, schwerpunktebeneId), inArray(weeks.id, weekIds)));

    if (existingWeeks.length !== weekIds.length) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Some week IDs do not belong to this schwerpunktebene',
      });
    }

    // Update order indices
    await Promise.all(
      weekIds.map((weekId, index) =>
        ctx.db
          .update(weeks)
          .set({ orderIndex: String(index), updatedAt: new Date() })
          .where(eq(weeks.id, weekId))
      )
    );

    return { success: true };
  }),

  /**
   * Reorder exercises within a week
   */
  reorderExercises: adminProcedure.input(reorderExercisesSchema).mutation(async ({ ctx, input }) => {
    const { weekId, weekExerciseIds } = input;

    // Verify week belongs to tenant (through schwerpunktebene)
    const [weekWithParent] = await ctx.db
      .select({
        week: weeks,
        schwerpunktebene: schwerpunktebenen,
      })
      .from(weeks)
      .innerJoin(schwerpunktebenen, eq(weeks.schwerpunktebeneId, schwerpunktebenen.id))
      .where(and(eq(weeks.id, weekId), eq(schwerpunktebenen.tenantId, ctx.tenantId)))
      .limit(1);

    if (!weekWithParent) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Week not found' });
    }

    // Verify all weekExercise IDs belong to this week
    const existingExercises = await ctx.db
      .select()
      .from(weekExercises)
      .where(and(eq(weekExercises.weekId, weekId), inArray(weekExercises.id, weekExerciseIds)));

    if (existingExercises.length !== weekExerciseIds.length) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Some exercise IDs do not belong to this week',
      });
    }

    // Update order indices
    await Promise.all(
      weekExerciseIds.map((weekExerciseId, index) =>
        ctx.db
          .update(weekExercises)
          .set({ orderIndex: index, updatedAt: new Date() })
          .where(eq(weekExercises.id, weekExerciseId))
      )
    );

    return { success: true };
  }),

  /**
   * Update exercise obligatory status
   */
  updateExerciseObligatory: adminProcedure
    .input(updateExerciseObligatorySchema)
    .mutation(async ({ ctx, input }) => {
      const { weekExerciseId, isObligatory } = input;

      // Verify weekExercise belongs to tenant
      const [weekExerciseWithParent] = await ctx.db
        .select({
          weekExercise: weekExercises,
          schwerpunktebene: schwerpunktebenen,
        })
        .from(weekExercises)
        .innerJoin(weeks, eq(weekExercises.weekId, weeks.id))
        .innerJoin(schwerpunktebenen, eq(weeks.schwerpunktebeneId, schwerpunktebenen.id))
        .where(
          and(eq(weekExercises.id, weekExerciseId), eq(schwerpunktebenen.tenantId, ctx.tenantId))
        )
        .limit(1);

      if (!weekExerciseWithParent) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Week exercise not found' });
      }

      await ctx.db
        .update(weekExercises)
        .set({ isObligatory, updatedAt: new Date() })
        .where(eq(weekExercises.id, weekExerciseId));

      return { success: true };
    }),

  /**
   * AI-powered translation for bilingual content
   */
  translateText: adminProcedure
    .input(
      translateTextSchema.extend({
        context: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { text, sourceLang, targetLang, context } = input;

      // Validate that source and target are different
      if (sourceLang === targetLang) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Source and target languages must be different',
        });
      }

      // Call the AI translation service
      const result = await translateText({
        tenantId: ctx.tenantId,
        userId: ctx.adminUserId,
        text,
        sourceLang,
        targetLang,
        context,
      });

      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Translation failed',
        });
      }

      return {
        translatedText: result.translatedText || '',
        sourceLang: result.sourceLang,
        targetLang: result.targetLang,
        note: null as string | null,
        tokens: {
          input: result.inputTokens,
          output: result.outputTokens,
          total: result.totalTokens,
        },
        durationMs: result.durationMs,
      };
    }),

  /**
   * Get all translation prompts for the tenant
   */
  getTranslationPrompts: adminProcedure.query(async ({ ctx }) => {
    const prompts = await getTranslationPrompts(ctx.tenantId);

    // Include default prompts info for reference
    return {
      customPrompts: prompts,
      defaultPrompts: {
        'de-en': {
          name: 'Default German to English',
          template: DEFAULT_TRANSLATION_PROMPTS['de-en'],
        },
        'en-de': {
          name: 'Default English to German',
          template: DEFAULT_TRANSLATION_PROMPTS['en-de'],
        },
      },
    };
  }),

  /**
   * Create or update a custom translation prompt
   */
  upsertTranslationPrompt: adminProcedure
    .input(
      z.object({
        sourceLang: z.enum(['de', 'en']),
        targetLang: z.enum(['de', 'en']),
        name: z.string().min(1).max(255),
        promptTemplate: z.string().min(10),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { sourceLang, targetLang, name, promptTemplate, isActive } = input;

      if (sourceLang === targetLang) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Source and target languages must be different',
        });
      }

      // Validate that prompt template contains required placeholders
      if (!promptTemplate.includes('{{text}}')) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Prompt template must contain {{text}} placeholder',
        });
      }

      const result = await upsertTranslationPrompt(
        ctx.tenantId,
        sourceLang,
        targetLang,
        name,
        promptTemplate,
        isActive
      );

      return { success: true, prompt: result };
    }),

  /**
   * Delete a custom translation prompt
   */
  deleteTranslationPrompt: adminProcedure
    .input(z.object({ promptId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await deleteTranslationPrompt(input.promptId, ctx.tenantId);
      return { success: true };
    }),

  /**
   * Reset a translation prompt to default
   */
  resetTranslationPromptToDefault: adminProcedure
    .input(
      z.object({
        sourceLang: z.enum(['de', 'en']),
        targetLang: z.enum(['de', 'en']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { sourceLang, targetLang } = input;

      if (sourceLang === targetLang) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Source and target languages must be different',
        });
      }

      const defaultTemplate = await resetTranslationPromptToDefault(
        ctx.tenantId,
        sourceLang,
        targetLang
      );

      return { success: true, defaultTemplate };
    }),

  // ==================== Context Generation (Herkunft/Ziel) ====================

  /**
   * Generate Herkunft (background/origin) text from a description
   */
  generateHerkunft: adminProcedure
    .input(
      z.object({
        description: z.string().min(1),
        language: z.enum(['de', 'en']),
        title: z.string().optional(),
        additionalContext: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { description, language, title, additionalContext } = input;

      const result = await generateContext({
        tenantId: ctx.tenantId,
        userId: ctx.adminUserId,
        description,
        contextType: 'herkunft',
        language,
        title,
        additionalContext,
      });

      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Herkunft generation failed',
        });
      }

      return {
        generatedText: result.generatedText || '',
        contextType: result.contextType,
        language: result.language,
        tokens: {
          input: result.inputTokens,
          output: result.outputTokens,
          total: result.totalTokens,
        },
        durationMs: result.durationMs,
      };
    }),

  /**
   * Generate Ziel (goal/purpose) text from a description
   */
  generateZiel: adminProcedure
    .input(
      z.object({
        description: z.string().min(1),
        language: z.enum(['de', 'en']),
        title: z.string().optional(),
        additionalContext: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { description, language, title, additionalContext } = input;

      const result = await generateContext({
        tenantId: ctx.tenantId,
        userId: ctx.adminUserId,
        description,
        contextType: 'ziel',
        language,
        title,
        additionalContext,
      });

      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Ziel generation failed',
        });
      }

      return {
        generatedText: result.generatedText || '',
        contextType: result.contextType,
        language: result.language,
        tokens: {
          input: result.inputTokens,
          output: result.outputTokens,
          total: result.totalTokens,
        },
        durationMs: result.durationMs,
      };
    }),

  /**
   * Generate both Herkunft and Ziel at once
   */
  generateBothContexts: adminProcedure
    .input(
      z.object({
        description: z.string().min(1),
        language: z.enum(['de', 'en']),
        title: z.string().optional(),
        additionalContext: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { description, language, title, additionalContext } = input;

      const result = await generateBothContexts({
        tenantId: ctx.tenantId,
        userId: ctx.adminUserId,
        description,
        language,
        title,
        additionalContext,
      });

      // Check if either generation failed
      const errors: string[] = [];
      if (!result.herkunft.success) {
        errors.push(`Herkunft: ${result.herkunft.error}`);
      }
      if (!result.ziel.success) {
        errors.push(`Ziel: ${result.ziel.error}`);
      }

      if (errors.length > 0) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: errors.join('; '),
        });
      }

      return {
        herkunft: {
          generatedText: result.herkunft.generatedText || '',
          tokens: {
            input: result.herkunft.inputTokens,
            output: result.herkunft.outputTokens,
            total: result.herkunft.totalTokens,
          },
          durationMs: result.herkunft.durationMs,
        },
        ziel: {
          generatedText: result.ziel.generatedText || '',
          tokens: {
            input: result.ziel.inputTokens,
            output: result.ziel.outputTokens,
            total: result.ziel.totalTokens,
          },
          durationMs: result.ziel.durationMs,
        },
        language,
      };
    }),

  /**
   * Get all context generation prompts for the tenant
   */
  getContextGenerationPrompts: adminProcedure.query(async ({ ctx }) => {
    const prompts = await getContextGenerationPrompts(ctx.tenantId);

    // Include default prompts info for reference
    return {
      customPrompts: prompts,
      defaultPrompts: {
        'herkunft-de': {
          name: 'Default Herkunft German',
          template: DEFAULT_CONTEXT_GENERATION_PROMPTS['herkunft-de'],
        },
        'herkunft-en': {
          name: 'Default Herkunft English',
          template: DEFAULT_CONTEXT_GENERATION_PROMPTS['herkunft-en'],
        },
        'ziel-de': {
          name: 'Default Ziel German',
          template: DEFAULT_CONTEXT_GENERATION_PROMPTS['ziel-de'],
        },
        'ziel-en': {
          name: 'Default Ziel English',
          template: DEFAULT_CONTEXT_GENERATION_PROMPTS['ziel-en'],
        },
      },
    };
  }),

  /**
   * Create or update a custom context generation prompt
   */
  upsertContextGenerationPrompt: adminProcedure
    .input(
      z.object({
        contextType: z.enum(['herkunft', 'ziel']),
        language: z.enum(['de', 'en']),
        name: z.string().min(1).max(255),
        promptTemplate: z.string().min(10),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { contextType, language, name, promptTemplate, isActive } = input;

      // Validate that prompt template contains required placeholder
      if (!promptTemplate.includes('{{description}}')) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Prompt template must contain {{description}} placeholder',
        });
      }

      const result = await upsertContextGenerationPrompt(
        ctx.tenantId,
        contextType,
        language,
        name,
        promptTemplate,
        isActive
      );

      return { success: true, prompt: result };
    }),

  /**
   * Delete a custom context generation prompt
   */
  deleteContextGenerationPrompt: adminProcedure
    .input(z.object({ promptId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await deleteContextGenerationPrompt(input.promptId, ctx.tenantId);
      return { success: true };
    }),

  /**
   * Reset a context generation prompt to default
   */
  resetContextGenerationPromptToDefault: adminProcedure
    .input(
      z.object({
        contextType: z.enum(['herkunft', 'ziel']),
        language: z.enum(['de', 'en']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { contextType, language } = input;

      const defaultTemplate = await resetContextGenerationPromptToDefault(
        ctx.tenantId,
        contextType,
        language
      );

      return { success: true, defaultTemplate };
    }),
});
