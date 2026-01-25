import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { classes, classMembers, classCurriculum, users, schwerpunktebenen } from '@/lib/db/schema';
import { eq, and, count, desc, asc, sql, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

// Input validation schemas
const classIdSchema = z.object({ id: z.string().uuid() });

const sessionConfigSchema = z.object({
  monthlySessionCount: z.number().int().positive().default(2),
  sessionDurationMinutes: z.number().int().positive().default(60),
});

const createClassSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  mentorId: z.string().uuid('Invalid mentor ID'),
  status: z.enum(['active', 'disabled']).default('active'),
  durationMonths: z.number().int().positive().default(3),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  sessionConfig: sessionConfigSchema.optional(),
});

const updateClassSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  mentorId: z.string().uuid().optional(),
  status: z.enum(['active', 'disabled']).optional(),
  durationMonths: z.number().int().positive().optional(),
  startDate: z.string().or(z.date()).optional(),
  endDate: z.string().or(z.date()).optional(),
  sessionConfig: sessionConfigSchema.optional(),
});

const listClassesSchema = z.object({
  status: z.enum(['active', 'disabled', 'all']).optional().default('all'),
  mentorId: z.string().uuid().optional(),
  sortBy: z.enum(['name', 'startDate', 'endDate', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
});

const addMemberSchema = z.object({
  classId: z.string().uuid(),
  userId: z.string().uuid(),
  amount: z.number().positive().optional(),
  dueDate: z.string().or(z.date()).optional(),
});

const removeMemberSchema = z.object({
  classId: z.string().uuid(),
  userId: z.string().uuid(),
});

const assignCurriculumSchema = z.object({
  classId: z.string().uuid(),
  schwerpunktebeneId: z.string().uuid(),
  monthNumber: z.number().int().positive(),
  customTitleDe: z.string().max(255).optional().nullable(),
  customTitleEn: z.string().max(255).optional().nullable(),
  customDescriptionDe: z.string().optional().nullable(),
  customDescriptionEn: z.string().optional().nullable(),
  mentorNotes: z.string().optional().nullable(),
});

const removeCurriculumSchema = z.object({
  classId: z.string().uuid(),
  monthNumber: z.number().int().positive(),
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

export const classesRouter = router({
  /**
   * List classes with filter and pagination
   */
  list: adminProcedure.input(listClassesSchema).query(async ({ ctx, input }) => {
    const { status, mentorId, sortBy, sortOrder, page, limit } = input;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(classes.tenantId, ctx.tenantId)];

    if (status !== 'all') {
      conditions.push(eq(classes.status, status));
    }

    if (mentorId) {
      conditions.push(eq(classes.mentorId, mentorId));
    }

    // Build sort order
    const orderColumn =
      sortBy === 'name'
        ? classes.name
        : sortBy === 'startDate'
          ? classes.startDate
          : sortBy === 'endDate'
            ? classes.endDate
            : classes.createdAt;
    const orderDirection = sortOrder === 'asc' ? asc : desc;

    const whereClause = and(...conditions);

    const [classesList, totalCount] = await Promise.all([
      ctx.db
        .select()
        .from(classes)
        .where(whereClause)
        .orderBy(orderDirection(orderColumn))
        .limit(limit)
        .offset(offset),
      ctx.db
        .select({ count: count() })
        .from(classes)
        .where(whereClause)
        .then((result) => result[0]?.count ?? 0),
    ]);

    // Get mentor information for all classes
    const mentorIds = Array.from(new Set(classesList.map((c) => c.mentorId)));
    let mentorsMap: Record<string, { id: string; name: string | null; email: string }> = {};

    if (mentorIds.length > 0) {
      const mentors = await ctx.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(inArray(users.id, mentorIds));

      mentorsMap = mentors.reduce(
        (acc, m) => {
          acc[m.id] = m;
          return acc;
        },
        {} as typeof mentorsMap
      );
    }

    // Get member count for each class
    const classIds = classesList.map((c) => c.id);
    let memberCountsMap: Record<string, number> = {};

    if (classIds.length > 0) {
      const memberCounts = await ctx.db
        .select({
          classId: classMembers.classId,
          count: count(),
        })
        .from(classMembers)
        .where(inArray(classMembers.classId, classIds))
        .groupBy(classMembers.classId);

      memberCountsMap = memberCounts.reduce(
        (acc, mc) => {
          acc[mc.classId] = Number(mc.count);
          return acc;
        },
        {} as typeof memberCountsMap
      );
    }

    // Enrich class list with mentor info and member count
    const enrichedClasses = classesList.map((cls) => ({
      ...cls,
      mentor: mentorsMap[cls.mentorId] || null,
      memberCount: memberCountsMap[cls.id] || 0,
    }));

    return {
      classes: enrichedClasses,
      pagination: {
        page,
        limit,
        total: Number(totalCount),
        totalPages: Math.ceil(Number(totalCount) / limit),
      },
    };
  }),

  /**
   * Get a class by ID with full details
   */
  getById: adminProcedure.input(classIdSchema).query(async ({ ctx, input }) => {
    const [cls] = await ctx.db
      .select()
      .from(classes)
      .where(and(eq(classes.id, input.id), eq(classes.tenantId, ctx.tenantId)))
      .limit(1);

    if (!cls) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Class not found' });
    }

    // Get mentor info
    const [mentor] = await ctx.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, cls.mentorId))
      .limit(1);

    // Get member count
    const [memberCountResult] = await ctx.db
      .select({ count: count() })
      .from(classMembers)
      .where(eq(classMembers.classId, cls.id));

    return {
      ...cls,
      mentor: mentor || null,
      memberCount: Number(memberCountResult?.count ?? 0),
    };
  }),

  /**
   * Create a new class
   */
  create: adminProcedure.input(createClassSchema).mutation(async ({ ctx, input }) => {
    // Verify mentor exists and belongs to tenant
    const [mentor] = await ctx.db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(
        and(
          eq(users.id, input.mentorId),
          eq(users.tenantId, ctx.tenantId),
          eq(users.role, 'mentor')
        )
      )
      .limit(1);

    if (!mentor) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Mentor not found or is not a mentor',
      });
    }

    const [newClass] = await ctx.db
      .insert(classes)
      .values({
        tenantId: ctx.tenantId,
        name: input.name,
        mentorId: input.mentorId,
        status: input.status,
        durationMonths: input.durationMonths,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        sessionConfig: input.sessionConfig ?? {
          monthlySessionCount: 2,
          sessionDurationMinutes: 60,
        },
      })
      .returning();

    return newClass;
  }),

  /**
   * Update a class
   */
  update: adminProcedure.input(updateClassSchema).mutation(async ({ ctx, input }) => {
    const { id, ...updateData } = input;

    // Check if class exists and belongs to tenant
    const [existing] = await ctx.db
      .select()
      .from(classes)
      .where(and(eq(classes.id, id), eq(classes.tenantId, ctx.tenantId)))
      .limit(1);

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Class not found' });
    }

    // If mentorId is being updated, verify the new mentor
    if (updateData.mentorId) {
      const [mentor] = await ctx.db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(
          and(
            eq(users.id, updateData.mentorId),
            eq(users.tenantId, ctx.tenantId),
            eq(users.role, 'mentor')
          )
        )
        .limit(1);

      if (!mentor) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Mentor not found or is not a mentor',
        });
      }
    }

    const updateValues: Record<string, unknown> = { updatedAt: new Date() };

    if (updateData.name !== undefined) updateValues.name = updateData.name;
    if (updateData.mentorId !== undefined) updateValues.mentorId = updateData.mentorId;
    if (updateData.status !== undefined) updateValues.status = updateData.status;
    if (updateData.durationMonths !== undefined) updateValues.durationMonths = updateData.durationMonths;
    if (updateData.startDate !== undefined) updateValues.startDate = new Date(updateData.startDate);
    if (updateData.endDate !== undefined) updateValues.endDate = new Date(updateData.endDate);
    if (updateData.sessionConfig !== undefined) updateValues.sessionConfig = updateData.sessionConfig;

    const [updatedClass] = await ctx.db
      .update(classes)
      .set(updateValues)
      .where(eq(classes.id, id))
      .returning();

    return updatedClass;
  }),

  /**
   * Delete a class
   */
  delete: adminProcedure.input(classIdSchema).mutation(async ({ ctx, input }) => {
    const { id } = input;

    // Check if class exists and belongs to tenant
    const [existing] = await ctx.db
      .select()
      .from(classes)
      .where(and(eq(classes.id, id), eq(classes.tenantId, ctx.tenantId)))
      .limit(1);

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Class not found' });
    }

    // Delete class (cascade will handle members and curriculum)
    await ctx.db.delete(classes).where(eq(classes.id, id));

    return { success: true, id };
  }),

  /**
   * Get class members
   */
  getMembers: adminProcedure.input(classIdSchema).query(async ({ ctx, input }) => {
    // Verify class exists and belongs to tenant
    const [cls] = await ctx.db
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.id, input.id), eq(classes.tenantId, ctx.tenantId)))
      .limit(1);

    if (!cls) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Class not found' });
    }

    // Get all members with user info
    const members = await ctx.db
      .select({
        id: classMembers.id,
        classId: classMembers.classId,
        userId: classMembers.userId,
        enrolledAt: classMembers.enrolledAt,
        completedAt: classMembers.completedAt,
        paid: classMembers.paid,
        amount: classMembers.amount,
        dueDate: classMembers.dueDate,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(classMembers)
      .innerJoin(users, eq(classMembers.userId, users.id))
      .where(eq(classMembers.classId, input.id))
      .orderBy(desc(classMembers.enrolledAt));

    return members;
  }),

  /**
   * Add a member to a class
   */
  addMember: adminProcedure.input(addMemberSchema).mutation(async ({ ctx, input }) => {
    // Verify class exists and belongs to tenant
    const [cls] = await ctx.db
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.id, input.classId), eq(classes.tenantId, ctx.tenantId)))
      .limit(1);

    if (!cls) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Class not found' });
    }

    // Verify user exists, belongs to tenant, and is a mentee
    const [user] = await ctx.db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(
        and(
          eq(users.id, input.userId),
          eq(users.tenantId, ctx.tenantId),
          eq(users.role, 'mentee')
        )
      )
      .limit(1);

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found or is not a mentee',
      });
    }

    // Check if user is already a member
    const [existingMember] = await ctx.db
      .select({ id: classMembers.id })
      .from(classMembers)
      .where(
        and(eq(classMembers.classId, input.classId), eq(classMembers.userId, input.userId))
      )
      .limit(1);

    if (existingMember) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'User is already a member of this class',
      });
    }

    const [newMember] = await ctx.db
      .insert(classMembers)
      .values({
        classId: input.classId,
        userId: input.userId,
        amount: input.amount ? String(input.amount) : null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      })
      .returning();

    return newMember;
  }),

  /**
   * Remove a member from a class
   */
  removeMember: adminProcedure.input(removeMemberSchema).mutation(async ({ ctx, input }) => {
    // Verify class exists and belongs to tenant
    const [cls] = await ctx.db
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.id, input.classId), eq(classes.tenantId, ctx.tenantId)))
      .limit(1);

    if (!cls) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Class not found' });
    }

    // Check if member exists
    const [existingMember] = await ctx.db
      .select({ id: classMembers.id })
      .from(classMembers)
      .where(
        and(eq(classMembers.classId, input.classId), eq(classMembers.userId, input.userId))
      )
      .limit(1);

    if (!existingMember) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Member not found' });
    }

    await ctx.db
      .delete(classMembers)
      .where(
        and(eq(classMembers.classId, input.classId), eq(classMembers.userId, input.userId))
      );

    return { success: true };
  }),

  /**
   * Get available mentees for adding to a class (not already in the class)
   */
  getAvailableMentees: adminProcedure.input(classIdSchema).query(async ({ ctx, input }) => {
    // Verify class exists and belongs to tenant
    const [cls] = await ctx.db
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.id, input.id), eq(classes.tenantId, ctx.tenantId)))
      .limit(1);

    if (!cls) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Class not found' });
    }

    // Get IDs of users already in the class
    const existingMembers = await ctx.db
      .select({ userId: classMembers.userId })
      .from(classMembers)
      .where(eq(classMembers.classId, input.id));

    const existingUserIds = existingMembers.map((m) => m.userId);

    // Get all mentees in the tenant who are not already members
    const availableMentees = await ctx.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(
        existingUserIds.length > 0
          ? and(
              eq(users.tenantId, ctx.tenantId),
              eq(users.role, 'mentee'),
              sql`${users.id} NOT IN (${sql.join(
                existingUserIds.map((id) => sql`${id}`),
                sql`, `
              )})`
            )
          : and(eq(users.tenantId, ctx.tenantId), eq(users.role, 'mentee'))
      )
      .orderBy(asc(users.name));

    return availableMentees;
  }),

  /**
   * Get class curriculum
   */
  getCurriculum: adminProcedure.input(classIdSchema).query(async ({ ctx, input }) => {
    // Verify class exists and belongs to tenant
    const [cls] = await ctx.db
      .select({ id: classes.id, durationMonths: classes.durationMonths })
      .from(classes)
      .where(and(eq(classes.id, input.id), eq(classes.tenantId, ctx.tenantId)))
      .limit(1);

    if (!cls) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Class not found' });
    }

    // Get all curriculum entries with schwerpunktebene info
    const curriculum = await ctx.db
      .select({
        id: classCurriculum.id,
        classId: classCurriculum.classId,
        schwerpunktebeneId: classCurriculum.schwerpunktebeneId,
        monthNumber: classCurriculum.monthNumber,
        customTitleDe: classCurriculum.customTitleDe,
        customTitleEn: classCurriculum.customTitleEn,
        customDescriptionDe: classCurriculum.customDescriptionDe,
        customDescriptionEn: classCurriculum.customDescriptionEn,
        mentorNotes: classCurriculum.mentorNotes,
        schwerpunktebene: {
          id: schwerpunktebenen.id,
          titleDe: schwerpunktebenen.titleDe,
          titleEn: schwerpunktebenen.titleEn,
          descriptionDe: schwerpunktebenen.descriptionDe,
          descriptionEn: schwerpunktebenen.descriptionEn,
        },
      })
      .from(classCurriculum)
      .innerJoin(schwerpunktebenen, eq(classCurriculum.schwerpunktebeneId, schwerpunktebenen.id))
      .where(eq(classCurriculum.classId, input.id))
      .orderBy(asc(classCurriculum.monthNumber));

    return {
      durationMonths: cls.durationMonths,
      curriculum,
    };
  }),

  /**
   * Assign a schwerpunktebene to a class month
   */
  assignCurriculum: adminProcedure.input(assignCurriculumSchema).mutation(async ({ ctx, input }) => {
    // Verify class exists and belongs to tenant
    const [cls] = await ctx.db
      .select({ id: classes.id, durationMonths: classes.durationMonths })
      .from(classes)
      .where(and(eq(classes.id, input.classId), eq(classes.tenantId, ctx.tenantId)))
      .limit(1);

    if (!cls) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Class not found' });
    }

    // Validate month number
    if (input.monthNumber > cls.durationMonths) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Month number cannot exceed class duration (${cls.durationMonths} months)`,
      });
    }

    // Verify schwerpunktebene exists and belongs to tenant
    const [schwerpunktebene] = await ctx.db
      .select({ id: schwerpunktebenen.id })
      .from(schwerpunktebenen)
      .where(
        and(
          eq(schwerpunktebenen.id, input.schwerpunktebeneId),
          eq(schwerpunktebenen.tenantId, ctx.tenantId)
        )
      )
      .limit(1);

    if (!schwerpunktebene) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Focus area not found' });
    }

    // Check if curriculum already exists for this month - if so, update it
    const [existing] = await ctx.db
      .select({ id: classCurriculum.id })
      .from(classCurriculum)
      .where(
        and(
          eq(classCurriculum.classId, input.classId),
          eq(classCurriculum.monthNumber, input.monthNumber)
        )
      )
      .limit(1);

    if (existing) {
      // Update existing curriculum entry
      const [updated] = await ctx.db
        .update(classCurriculum)
        .set({
          schwerpunktebeneId: input.schwerpunktebeneId,
          customTitleDe: input.customTitleDe,
          customTitleEn: input.customTitleEn,
          customDescriptionDe: input.customDescriptionDe,
          customDescriptionEn: input.customDescriptionEn,
          mentorNotes: input.mentorNotes,
          updatedAt: new Date(),
        })
        .where(eq(classCurriculum.id, existing.id))
        .returning();

      return updated;
    }

    // Create new curriculum entry
    const [newCurriculum] = await ctx.db
      .insert(classCurriculum)
      .values({
        classId: input.classId,
        schwerpunktebeneId: input.schwerpunktebeneId,
        monthNumber: input.monthNumber,
        customTitleDe: input.customTitleDe,
        customTitleEn: input.customTitleEn,
        customDescriptionDe: input.customDescriptionDe,
        customDescriptionEn: input.customDescriptionEn,
        mentorNotes: input.mentorNotes,
      })
      .returning();

    return newCurriculum;
  }),

  /**
   * Remove curriculum assignment from a month
   */
  removeCurriculum: adminProcedure.input(removeCurriculumSchema).mutation(async ({ ctx, input }) => {
    // Verify class exists and belongs to tenant
    const [cls] = await ctx.db
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.id, input.classId), eq(classes.tenantId, ctx.tenantId)))
      .limit(1);

    if (!cls) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Class not found' });
    }

    // Check if curriculum exists
    const [existing] = await ctx.db
      .select({ id: classCurriculum.id })
      .from(classCurriculum)
      .where(
        and(
          eq(classCurriculum.classId, input.classId),
          eq(classCurriculum.monthNumber, input.monthNumber)
        )
      )
      .limit(1);

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Curriculum assignment not found' });
    }

    await ctx.db.delete(classCurriculum).where(eq(classCurriculum.id, existing.id));

    return { success: true };
  }),

  /**
   * Get available schwerpunktebenen for curriculum assignment
   */
  getAvailableSchwerpunktebenen: adminProcedure.query(async ({ ctx }) => {
    const schwerpunktebenenList = await ctx.db
      .select({
        id: schwerpunktebenen.id,
        titleDe: schwerpunktebenen.titleDe,
        titleEn: schwerpunktebenen.titleEn,
        monthNumber: schwerpunktebenen.monthNumber,
      })
      .from(schwerpunktebenen)
      .where(eq(schwerpunktebenen.tenantId, ctx.tenantId))
      .orderBy(asc(schwerpunktebenen.monthNumber), asc(schwerpunktebenen.titleDe));

    return schwerpunktebenenList;
  }),

  /**
   * Get all mentors for class creation/editing
   */
  getMentors: adminProcedure.query(async ({ ctx }) => {
    const mentors = await ctx.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(and(eq(users.tenantId, ctx.tenantId), eq(users.role, 'mentor')))
      .orderBy(asc(users.name));

    return mentors;
  }),
});
