import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { diaryEntries, users } from '@/lib/db/schema';
import { eq, and, gte, lte, desc, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { transcribeDiaryEntry, type TranscriptionLanguage } from '@/lib/ai/transcription';

/**
 * Diary middleware - ensures user has mentee role and extracts user info
 */
const diaryProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const userRoles = ctx.session.user.roles || [];

  // Allow mentee, mentor, admin, and superadmin to access diary
  if (
    !userRoles.includes('mentee') &&
    !userRoles.includes('mentor') &&
    !userRoles.includes('admin') &&
    !userRoles.includes('superadmin')
  ) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
  }

  const [user] = await ctx.db
    .select({ id: users.id, tenantId: users.tenantId })
    .from(users)
    .where(eq(users.email, ctx.session.user.email))
    .limit(1);

  if (!user) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'User not found',
    });
  }

  return next({
    ctx: {
      ...ctx,
      tenantId: user.tenantId,
      userId: user.id,
    },
  });
});

export const diaryRouter = router({
  /**
   * Get diary entries for the current user
   * Supports filtering by date range and pagination
   */
  getEntries: diaryProcedure
    .input(
      z.object({
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(diaryEntries.userId, ctx.userId)];

      if (input.startDate) {
        conditions.push(gte(diaryEntries.entryDate, new Date(input.startDate)));
      }

      if (input.endDate) {
        conditions.push(lte(diaryEntries.entryDate, new Date(input.endDate)));
      }

      const orderBy = input.sortOrder === 'asc'
        ? asc(diaryEntries.entryDate)
        : desc(diaryEntries.entryDate);

      const entries = await ctx.db
        .select({
          id: diaryEntries.id,
          entryType: diaryEntries.entryType,
          content: diaryEntries.content,
          voiceRecordingUrl: diaryEntries.voiceRecordingUrl,
          voiceRecordingDuration: diaryEntries.voiceRecordingDuration,
          voiceTranscription: diaryEntries.voiceTranscription,
          transcriptionStatus: diaryEntries.transcriptionStatus,
          transcriptionLanguage: diaryEntries.transcriptionLanguage,
          transcriptionError: diaryEntries.transcriptionError,
          entryDate: diaryEntries.entryDate,
          createdAt: diaryEntries.createdAt,
          updatedAt: diaryEntries.updatedAt,
        })
        .from(diaryEntries)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(input.limit)
        .offset(input.offset);

      return entries;
    }),

  /**
   * Get a single diary entry by ID
   */
  getEntry: diaryProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const [entry] = await ctx.db
        .select({
          id: diaryEntries.id,
          entryType: diaryEntries.entryType,
          content: diaryEntries.content,
          voiceRecordingUrl: diaryEntries.voiceRecordingUrl,
          voiceRecordingDuration: diaryEntries.voiceRecordingDuration,
          voiceTranscription: diaryEntries.voiceTranscription,
          transcriptionStatus: diaryEntries.transcriptionStatus,
          transcriptionLanguage: diaryEntries.transcriptionLanguage,
          transcriptionError: diaryEntries.transcriptionError,
          entryDate: diaryEntries.entryDate,
          createdAt: diaryEntries.createdAt,
          updatedAt: diaryEntries.updatedAt,
        })
        .from(diaryEntries)
        .where(and(eq(diaryEntries.id, input.id), eq(diaryEntries.userId, ctx.userId)))
        .limit(1);

      if (!entry) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Diary entry not found',
        });
      }

      return entry;
    }),

  /**
   * Create a new diary entry
   */
  createEntry: diaryProcedure
    .input(
      z.object({
        content: z.string().optional(),
        voiceRecordingUrl: z.string().url().optional(),
        voiceRecordingDuration: z.number().int().positive().optional(),
        entryDate: z.string().datetime().optional(),
        entryType: z.enum(['text', 'voice', 'mixed']).default('text'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate that at least content or voice recording is provided
      if (!input.content && !input.voiceRecordingUrl) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Either content or voice recording must be provided',
        });
      }

      // Determine entry type based on content
      let entryType = input.entryType;
      if (input.content && input.voiceRecordingUrl) {
        entryType = 'mixed';
      } else if (input.voiceRecordingUrl && !input.content) {
        entryType = 'voice';
      } else if (input.content && !input.voiceRecordingUrl) {
        entryType = 'text';
      }

      const entryDate = input.entryDate ? new Date(input.entryDate) : new Date();

      const [newEntry] = await ctx.db
        .insert(diaryEntries)
        .values({
          userId: ctx.userId,
          entryType,
          content: input.content || null,
          voiceRecordingUrl: input.voiceRecordingUrl || null,
          voiceRecordingDuration: input.voiceRecordingDuration || null,
          entryDate,
        })
        .returning();

      return newEntry;
    }),

  /**
   * Update an existing diary entry
   */
  updateEntry: diaryProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        content: z.string().optional(),
        voiceRecordingUrl: z.string().url().optional().nullable(),
        voiceRecordingDuration: z.number().int().positive().optional().nullable(),
        entryDate: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the entry belongs to this user
      const [existing] = await ctx.db
        .select({ id: diaryEntries.id })
        .from(diaryEntries)
        .where(and(eq(diaryEntries.id, input.id), eq(diaryEntries.userId, ctx.userId)))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Diary entry not found',
        });
      }

      // Build update object
      const updateData: {
        content?: string | null;
        voiceRecordingUrl?: string | null;
        voiceRecordingDuration?: number | null;
        entryDate?: Date;
        entryType?: 'text' | 'voice' | 'mixed';
        updatedAt: Date;
      } = {
        updatedAt: new Date(),
      };

      if (input.content !== undefined) {
        updateData.content = input.content || null;
      }

      if (input.voiceRecordingUrl !== undefined) {
        updateData.voiceRecordingUrl = input.voiceRecordingUrl;
      }

      if (input.voiceRecordingDuration !== undefined) {
        updateData.voiceRecordingDuration = input.voiceRecordingDuration;
      }

      if (input.entryDate) {
        updateData.entryDate = new Date(input.entryDate);
      }

      // Determine new entry type based on final content
      const finalContent = input.content !== undefined ? input.content : undefined;
      const finalVoiceUrl = input.voiceRecordingUrl !== undefined ? input.voiceRecordingUrl : undefined;

      // Only update entry type if we have complete information
      if (finalContent !== undefined || finalVoiceUrl !== undefined) {
        if (finalContent && finalVoiceUrl) {
          updateData.entryType = 'mixed';
        } else if (finalVoiceUrl && !finalContent) {
          updateData.entryType = 'voice';
        } else if (finalContent && !finalVoiceUrl) {
          updateData.entryType = 'text';
        }
      }

      const [updated] = await ctx.db
        .update(diaryEntries)
        .set(updateData)
        .where(eq(diaryEntries.id, input.id))
        .returning();

      return updated;
    }),

  /**
   * Delete a diary entry
   */
  deleteEntry: diaryProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the entry belongs to this user
      const [existing] = await ctx.db
        .select({ id: diaryEntries.id })
        .from(diaryEntries)
        .where(and(eq(diaryEntries.id, input.id), eq(diaryEntries.userId, ctx.userId)))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Diary entry not found',
        });
      }

      await ctx.db.delete(diaryEntries).where(eq(diaryEntries.id, input.id));

      return { success: true };
    }),

  /**
   * Get entries count for date range (for calendar highlighting)
   */
  getEntriesCount: diaryProcedure
    .input(
      z.object({
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
      })
    )
    .query(async ({ ctx, input }) => {
      const entries = await ctx.db
        .select({
          entryDate: diaryEntries.entryDate,
        })
        .from(diaryEntries)
        .where(
          and(
            eq(diaryEntries.userId, ctx.userId),
            gte(diaryEntries.entryDate, new Date(input.startDate)),
            lte(diaryEntries.entryDate, new Date(input.endDate))
          )
        );

      // Group by date and count
      const countByDate: Record<string, number> = {};
      for (const entry of entries) {
        const dateKey = entry.entryDate.toISOString().split('T')[0];
        countByDate[dateKey] = (countByDate[dateKey] || 0) + 1;
      }

      return countByDate;
    }),

  /**
   * Transcribe voice recording for a diary entry
   * Uses tenant's AI configuration to transcribe the audio
   */
  transcribeEntry: diaryProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        language: z.enum(['de', 'en']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the entry belongs to this user and has a voice recording
      const [entry] = await ctx.db
        .select({
          id: diaryEntries.id,
          voiceRecordingUrl: diaryEntries.voiceRecordingUrl,
          transcriptionStatus: diaryEntries.transcriptionStatus,
        })
        .from(diaryEntries)
        .where(and(eq(diaryEntries.id, input.id), eq(diaryEntries.userId, ctx.userId)))
        .limit(1);

      if (!entry) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Diary entry not found',
        });
      }

      if (!entry.voiceRecordingUrl) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No voice recording found for this entry',
        });
      }

      // Check if already processing
      if (entry.transcriptionStatus === 'processing') {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Transcription is already in progress',
        });
      }

      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'User must be associated with a tenant',
        });
      }

      // Perform transcription
      const result = await transcribeDiaryEntry(
        entry.id,
        ctx.tenantId,
        ctx.userId,
        input.language as TranscriptionLanguage | undefined
      );

      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Transcription failed',
        });
      }

      return {
        success: true,
        transcription: result.transcription,
        language: result.language,
      };
    }),

  /**
   * Get transcription status for a diary entry
   */
  getTranscriptionStatus: diaryProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const [entry] = await ctx.db
        .select({
          id: diaryEntries.id,
          voiceTranscription: diaryEntries.voiceTranscription,
          transcriptionStatus: diaryEntries.transcriptionStatus,
          transcriptionLanguage: diaryEntries.transcriptionLanguage,
          transcriptionError: diaryEntries.transcriptionError,
        })
        .from(diaryEntries)
        .where(and(eq(diaryEntries.id, input.id), eq(diaryEntries.userId, ctx.userId)))
        .limit(1);

      if (!entry) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Diary entry not found',
        });
      }

      return {
        status: entry.transcriptionStatus,
        transcription: entry.voiceTranscription,
        language: entry.transcriptionLanguage,
        error: entry.transcriptionError,
      };
    }),
});
