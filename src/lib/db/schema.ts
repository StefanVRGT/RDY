import { pgTable, uuid, varchar, timestamp, jsonb, pgEnum, text, index, integer, boolean, decimal, unique } from 'drizzle-orm/pg-core';

// Enum for tenant status
export const tenantStatusEnum = pgEnum('tenant_status', ['active', 'disabled']);

// Enum for user roles
export const userRoleEnum = pgEnum('user_role', ['superadmin', 'admin', 'mentor', 'mentee']);

// Tenants table - core multi-tenancy support
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  settings: jsonb('settings').default({}).notNull(),
  // Logo and branding fields
  logoUrl: text('logo_url'),
  primaryColor: varchar('primary_color', { length: 7 }),
  secondaryColor: varchar('secondary_color', { length: 7 }),
  // Status field
  status: tenantStatusEnum('status').default('active').notNull(),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;

// Users table - includes tenant_id foreign key for multi-tenancy
// Note: All other tables include tenant_id foreign key for multi-tenancy support
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Tenant association - null for superadmin users
  tenantId: uuid('tenant_id').references(() => tenants.id),
  // User role
  role: userRoleEnum('role').notNull().default('mentee'),
  // Self-referencing mentor_id for mentee-mentor relationship
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mentorId: uuid('mentor_id').references((): any => users.id),
  // Basic info
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  // Address fields
  address: varchar('address', { length: 500 }),
  plz: varchar('plz', { length: 20 }),
  city: varchar('city', { length: 255 }),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Enum for invitation status
export const invitationStatusEnum = pgEnum('invitation_status', [
  'pending',
  'accepted',
  'expired',
  'revoked',
]);

// Invitations table - for onboarding new users with role pre-assignment
export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Tenant association - invitations are tenant-scoped
    tenantId: uuid('tenant_id')
      .references(() => tenants.id)
      .notNull(),
    // Email of the invited user
    email: varchar('email', { length: 255 }).notNull(),
    // Pre-assigned role for the invited user
    role: userRoleEnum('role').notNull().default('mentee'),
    // Invitation status tracking
    status: invitationStatusEnum('status').notNull().default('pending'),
    // Unique token for invitation link
    token: varchar('token', { length: 64 }).notNull().unique(),
    // Expiry timestamp
    expiresAt: timestamp('expires_at').notNull(),
    // User who created the invitation
    invitedBy: uuid('invited_by')
      .references(() => users.id)
      .notNull(),
    // User ID when invitation is accepted
    acceptedBy: uuid('accepted_by').references(() => users.id),
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('invitations_tenant_idx').on(table.tenantId),
    index('invitations_email_idx').on(table.email),
    index('invitations_token_idx').on(table.token),
    index('invitations_status_idx').on(table.status),
  ]
);

export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;

// Schwerpunktebenen table - monthly focus areas in the 3-month program cycle
export const schwerpunktebenen = pgTable(
  'schwerpunktebenen',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Tenant association - schwerpunktebenen are tenant-scoped
    tenantId: uuid('tenant_id')
      .references(() => tenants.id)
      .notNull(),
    // Month number in the 3-month cycle (1, 2, or 3)
    monthNumber: varchar('month_number', { length: 1 }).notNull(),
    // Bilingual title fields (DE/EN)
    titleDe: varchar('title_de', { length: 255 }).notNull(),
    titleEn: varchar('title_en', { length: 255 }),
    // Bilingual description fields (DE/EN)
    descriptionDe: text('description_de'),
    descriptionEn: text('description_en'),
    // Bilingual herkunft (origin) fields (DE/EN)
    herkunftDe: text('herkunft_de'),
    herkunftEn: text('herkunft_en'),
    // Bilingual ziel (goal) fields (DE/EN)
    zielDe: text('ziel_de'),
    zielEn: text('ziel_en'),
    // Image URL for visual representation
    imageUrl: text('image_url'),
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('schwerpunktebenen_tenant_idx').on(table.tenantId),
    index('schwerpunktebenen_month_idx').on(table.monthNumber),
  ]
);

export type Schwerpunktebene = typeof schwerpunktebenen.$inferSelect;
export type NewSchwerpunktebene = typeof schwerpunktebenen.$inferInsert;

// Enum for measurement types
export const measurementTypeEnum = pgEnum('measurement_type', [
  'scale_1_10',
  'yes_no',
  'frequency',
  'percentage',
  'custom',
]);

// Weeks table - weekly focus areas within a Schwerpunktebene (each phase has ~3 weeks)
export const weeks = pgTable(
  'weeks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Foreign key to schwerpunktebene
    schwerpunktebeneId: uuid('schwerpunktebene_id')
      .references(() => schwerpunktebenen.id, { onDelete: 'cascade' })
      .notNull(),
    // Week number within the schwerpunktebene (1, 2, 3, etc.)
    weekNumber: varchar('week_number', { length: 2 }).notNull(),
    // Order index for custom ordering/reordering
    orderIndex: varchar('order_index', { length: 10 }).notNull().default('0'),
    // Bilingual title fields (DE/EN)
    titleDe: varchar('title_de', { length: 255 }).notNull(),
    titleEn: varchar('title_en', { length: 255 }),
    // Bilingual description fields (DE/EN)
    descriptionDe: text('description_de'),
    descriptionEn: text('description_en'),
    // Bilingual herkunft (origin/background) fields (DE/EN)
    herkunftDe: text('herkunft_de'),
    herkunftEn: text('herkunft_en'),
    // Bilingual ziel (goal) fields (DE/EN)
    zielDe: text('ziel_de'),
    zielEn: text('ziel_en'),
    // Measurement type for tracking progress
    measurementType: measurementTypeEnum('measurement_type').default('scale_1_10'),
    // Bilingual measurement question fields (DE/EN)
    measurementQuestionDe: text('measurement_question_de'),
    measurementQuestionEn: text('measurement_question_en'),
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('weeks_schwerpunktebene_idx').on(table.schwerpunktebeneId),
    index('weeks_order_idx').on(table.schwerpunktebeneId, table.orderIndex),
  ]
);

export type Week = typeof weeks.$inferSelect;
export type NewWeek = typeof weeks.$inferInsert;

// Enum for exercise types
export const exerciseTypeEnum = pgEnum('exercise_type', ['video', 'audio', 'text']);

// Exercises table - content library with video, audio, and text content
export const exercises = pgTable(
  'exercises',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Tenant association - exercises are tenant-scoped
    tenantId: uuid('tenant_id')
      .references(() => tenants.id)
      .notNull(),
    // Exercise type (video, audio, text)
    type: exerciseTypeEnum('type').notNull().default('text'),
    // Bilingual title fields (DE/EN)
    titleDe: varchar('title_de', { length: 255 }).notNull(),
    titleEn: varchar('title_en', { length: 255 }),
    // Bilingual description fields (DE/EN)
    descriptionDe: text('description_de'),
    descriptionEn: text('description_en'),
    // Duration in minutes
    durationMinutes: integer('duration_minutes'),
    // Media URLs
    videoUrl: text('video_url'),
    audioUrl: text('audio_url'),
    // Text content for text-type exercises (bilingual)
    contentDe: text('content_de'),
    contentEn: text('content_en'),
    // Order index for custom ordering
    orderIndex: varchar('order_index', { length: 10 }).notNull().default('0'),
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('exercises_tenant_idx').on(table.tenantId),
    index('exercises_type_idx').on(table.type),
    index('exercises_order_idx').on(table.tenantId, table.orderIndex),
  ]
);

export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;

// Enum for exercise frequency within a week
export const exerciseFrequencyEnum = pgEnum('exercise_frequency', ['daily', 'weekly', 'custom']);

// WeekExercises junction table - links weeks to exercises with ordering and settings
export const weekExercises = pgTable(
  'week_exercises',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Foreign key to week
    weekId: uuid('week_id')
      .references(() => weeks.id, { onDelete: 'cascade' })
      .notNull(),
    // Foreign key to exercise
    exerciseId: uuid('exercise_id')
      .references(() => exercises.id, { onDelete: 'cascade' })
      .notNull(),
    // Order index for sequencing exercises within a week
    orderIndex: integer('order_index').notNull().default(0),
    // Obligatory vs optional flag
    isObligatory: boolean('is_obligatory').notNull().default(true),
    // Frequency settings (daily/weekly/custom)
    frequency: exerciseFrequencyEnum('frequency').notNull().default('daily'),
    // Custom frequency description (used when frequency is 'custom')
    customFrequency: varchar('custom_frequency', { length: 255 }),
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('week_exercises_week_idx').on(table.weekId),
    index('week_exercises_exercise_idx').on(table.exerciseId),
    index('week_exercises_order_idx').on(table.weekId, table.orderIndex),
  ]
);

export type WeekExercise = typeof weekExercises.$inferSelect;
export type NewWeekExercise = typeof weekExercises.$inferInsert;

// Enum for class status
export const classStatusEnum = pgEnum('class_status', ['active', 'disabled']);

// Classes table - groups mentees under a mentor with duration and session settings
export const classes = pgTable(
  'classes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Tenant association - classes are tenant-scoped
    tenantId: uuid('tenant_id')
      .references(() => tenants.id)
      .notNull(),
    // Mentor assignment - foreign key to users table
    mentorId: uuid('mentor_id')
      .references(() => users.id)
      .notNull(),
    // Class name
    name: varchar('name', { length: 255 }).notNull(),
    // Status (active/disabled)
    status: classStatusEnum('status').default('active').notNull(),
    // Duration in months (default 3 months)
    durationMonths: integer('duration_months').default(3).notNull(),
    // Start and end dates
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),
    // Session configuration stored as JSONB
    // Structure: { monthlySessionCount: number, sessionDurationMinutes: number }
    sessionConfig: jsonb('session_config').default({
      monthlySessionCount: 2,
      sessionDurationMinutes: 60,
    }).notNull(),
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('classes_tenant_idx').on(table.tenantId),
    index('classes_mentor_idx').on(table.mentorId),
    index('classes_status_idx').on(table.status),
    index('classes_dates_idx').on(table.startDate, table.endDate),
  ]
);

export type Class = typeof classes.$inferSelect;
export type NewClass = typeof classes.$inferInsert;

// Type for session configuration
export type SessionConfig = {
  monthlySessionCount: number;
  sessionDurationMinutes: number;
};

// ClassMembers junction table - links mentees to classes with enrollment and payment tracking
export const classMembers = pgTable(
  'class_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Foreign key to class
    classId: uuid('class_id')
      .references(() => classes.id, { onDelete: 'cascade' })
      .notNull(),
    // Foreign key to user (mentee)
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    // Enrollment timestamp
    enrolledAt: timestamp('enrolled_at').defaultNow().notNull(),
    // Completion timestamp (null if not completed)
    completedAt: timestamp('completed_at'),
    // Payment tracking fields
    paid: boolean('paid').default(false).notNull(),
    amount: decimal('amount', { precision: 10, scale: 2 }),
    dueDate: timestamp('due_date'),
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    // Unique constraint on class_id + user_id to prevent duplicate enrollments
    unique('class_members_class_user_unique').on(table.classId, table.userId),
    index('class_members_class_idx').on(table.classId),
    index('class_members_user_idx').on(table.userId),
    index('class_members_paid_idx').on(table.paid),
  ]
);

export type ClassMember = typeof classMembers.$inferSelect;
export type NewClassMember = typeof classMembers.$inferInsert;

// ClassCurriculum table - links classes to schwerpunktebenen by month for curriculum assignment
export const classCurriculum = pgTable(
  'class_curriculum',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Foreign key to class
    classId: uuid('class_id')
      .references(() => classes.id, { onDelete: 'cascade' })
      .notNull(),
    // Foreign key to schwerpunktebene (curriculum template)
    schwerpunktebeneId: uuid('schwerpunktebene_id')
      .references(() => schwerpunktebenen.id, { onDelete: 'cascade' })
      .notNull(),
    // Month assignment within the class (1, 2, 3, etc.)
    monthNumber: integer('month_number').notNull(),
    // Customization fields - allows mentor to override default schwerpunktebene content
    customTitleDe: varchar('custom_title_de', { length: 255 }),
    customTitleEn: varchar('custom_title_en', { length: 255 }),
    customDescriptionDe: text('custom_description_de'),
    customDescriptionEn: text('custom_description_en'),
    // Notes for mentor customization
    mentorNotes: text('mentor_notes'),
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    // Unique constraint on class_id + month_number to prevent duplicate month assignments
    unique('class_curriculum_class_month_unique').on(table.classId, table.monthNumber),
    index('class_curriculum_class_idx').on(table.classId),
    index('class_curriculum_schwerpunktebene_idx').on(table.schwerpunktebeneId),
    index('class_curriculum_month_idx').on(table.monthNumber),
  ]
);

export type ClassCurriculum = typeof classCurriculum.$inferSelect;
export type NewClassCurriculum = typeof classCurriculum.$inferInsert;

// ScheduledExercises table - tracks individual exercise occurrences for mentees
export const scheduledExercises = pgTable(
  'scheduled_exercises',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Foreign key to user (mentee)
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    // Foreign key to exercise
    exerciseId: uuid('exercise_id')
      .references(() => exercises.id, { onDelete: 'cascade' })
      .notNull(),
    // Foreign key to class
    classId: uuid('class_id')
      .references(() => classes.id, { onDelete: 'cascade' })
      .notNull(),
    // Scheduled datetime for this exercise occurrence
    scheduledAt: timestamp('scheduled_at').notNull(),
    // Completion tracking
    completed: boolean('completed').default(false).notNull(),
    completedAt: timestamp('completed_at'),
    // Notes field for mentee or mentor comments
    notes: text('notes'),
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('scheduled_exercises_user_idx').on(table.userId),
    index('scheduled_exercises_exercise_idx').on(table.exerciseId),
    index('scheduled_exercises_class_idx').on(table.classId),
    index('scheduled_exercises_scheduled_idx').on(table.scheduledAt),
    index('scheduled_exercises_completed_idx').on(table.completed),
  ]
);

export type ScheduledExercise = typeof scheduledExercises.$inferSelect;
export type NewScheduledExercise = typeof scheduledExercises.$inferInsert;

// WeeklyRecurringExercises table - recurring exercise patterns for daily routines
export const weeklyRecurringExercises = pgTable(
  'weekly_recurring_exercises',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Foreign key to user (mentee)
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    // Foreign key to exercise
    exerciseId: uuid('exercise_id')
      .references(() => exercises.id, { onDelete: 'cascade' })
      .notNull(),
    // Default time of day for the exercise (stored as time string HH:MM)
    defaultTime: varchar('default_time', { length: 5 }).notNull(),
    // Applicable days of the week (1=Monday, 2=Tuesday, ..., 7=Sunday)
    // Stored as an array of integers using JSONB
    applicableDays: jsonb('applicable_days').$type<number[]>().notNull(),
    // Active date range
    activeFrom: timestamp('active_from').notNull(),
    activeThrough: timestamp('active_through'),
    // Duration in minutes
    durationMinutes: integer('duration_minutes').notNull(),
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('weekly_recurring_exercises_user_idx').on(table.userId),
    index('weekly_recurring_exercises_exercise_idx').on(table.exerciseId),
    index('weekly_recurring_exercises_active_idx').on(table.activeFrom, table.activeThrough),
  ]
);

export type WeeklyRecurringExercise = typeof weeklyRecurringExercises.$inferSelect;
export type NewWeeklyRecurringExercise = typeof weeklyRecurringExercises.$inferInsert;

// MentorAvailability table - stores mentor's availability time slots
export const mentorAvailability = pgTable(
  'mentor_availability',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Foreign key to user (mentor)
    mentorId: uuid('mentor_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    // Tenant association - availability is tenant-scoped
    tenantId: uuid('tenant_id')
      .references(() => tenants.id)
      .notNull(),
    // Start and end datetime for the availability slot
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time').notNull(),
    // Whether this is a recurring slot
    isRecurring: boolean('is_recurring').default(false).notNull(),
    // Day of week for recurring slots (0=Sunday, 1=Monday, ..., 6=Saturday)
    // Null for non-recurring (one-time) slots
    dayOfWeek: integer('day_of_week'),
    // Recurrence pattern: time only (HH:MM format) for recurring slots
    recurringStartTime: varchar('recurring_start_time', { length: 5 }),
    recurringEndTime: varchar('recurring_end_time', { length: 5 }),
    // Date range for when recurring availability is valid
    validFrom: timestamp('valid_from'),
    validUntil: timestamp('valid_until'),
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('mentor_availability_mentor_idx').on(table.mentorId),
    index('mentor_availability_tenant_idx').on(table.tenantId),
    index('mentor_availability_time_idx').on(table.startTime, table.endTime),
    index('mentor_availability_recurring_idx').on(table.isRecurring, table.dayOfWeek),
  ]
);

export type MentorAvailability = typeof mentorAvailability.$inferSelect;
export type NewMentorAvailability = typeof mentorAvailability.$inferInsert;

// Enum for mentoring session type
export const sessionTypeEnum = pgEnum('session_type', ['1:1', 'group']);

// Enum for mentoring session status
export const sessionStatusEnum = pgEnum('session_status', [
  'scheduled',
  'available',
  'booked',
  'completed',
  'cancelled',
]);

// MentoringSessions table - tracks 1:1 and group mentoring sessions
export const mentoringSessions = pgTable(
  'mentoring_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Tenant association
    tenantId: uuid('tenant_id')
      .references(() => tenants.id)
      .notNull(),
    // Foreign key to mentor user
    mentorId: uuid('mentor_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    // Foreign key to mentee user (null for group sessions or available slots)
    menteeId: uuid('mentee_id')
      .references(() => users.id, { onDelete: 'cascade' }),
    // Foreign key to class (optional, for class-based sessions)
    classId: uuid('class_id')
      .references(() => classes.id, { onDelete: 'set null' }),
    // Session type (1:1 or group)
    sessionType: sessionTypeEnum('session_type').notNull().default('1:1'),
    // Session status
    status: sessionStatusEnum('status').notNull().default('available'),
    // Scheduled datetime
    scheduledAt: timestamp('scheduled_at').notNull(),
    // Duration in minutes
    durationMinutes: integer('duration_minutes').notNull().default(60),
    // Session summary/notes
    notes: text('notes'),
    // Voice recording flag
    hasVoiceRecording: boolean('has_voice_recording').default(false).notNull(),
    // Voice recording URL
    voiceRecordingUrl: text('voice_recording_url'),
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('mentoring_sessions_tenant_idx').on(table.tenantId),
    index('mentoring_sessions_mentor_idx').on(table.mentorId),
    index('mentoring_sessions_mentee_idx').on(table.menteeId),
    index('mentoring_sessions_class_idx').on(table.classId),
    index('mentoring_sessions_status_idx').on(table.status),
    index('mentoring_sessions_scheduled_idx').on(table.scheduledAt),
    index('mentoring_sessions_type_idx').on(table.sessionType),
  ]
);

export type MentoringSession = typeof mentoringSessions.$inferSelect;
export type NewMentoringSession = typeof mentoringSessions.$inferInsert;

// Enum for RSVP status in group sessions
export const rsvpStatusEnum = pgEnum('rsvp_status', ['pending', 'accepted', 'declined']);

// GroupSessions table - tracks group mentoring sessions created by mentors
export const groupSessions = pgTable(
  'group_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Tenant association
    tenantId: uuid('tenant_id')
      .references(() => tenants.id)
      .notNull(),
    // Foreign key to mentor user
    mentorId: uuid('mentor_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    // Foreign key to class (optional, for class-based sessions)
    classId: uuid('class_id')
      .references(() => classes.id, { onDelete: 'set null' }),
    // Session details
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    // Session agenda field
    agenda: text('agenda'),
    // Scheduled datetime
    scheduledAt: timestamp('scheduled_at').notNull(),
    // Duration in minutes
    durationMinutes: integer('duration_minutes').notNull().default(60),
    // Max participants setting
    maxParticipants: integer('max_participants'),
    // Session status
    status: sessionStatusEnum('status').notNull().default('scheduled'),
    // Location (virtual link or physical location)
    location: text('location'),
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('group_sessions_tenant_idx').on(table.tenantId),
    index('group_sessions_mentor_idx').on(table.mentorId),
    index('group_sessions_class_idx').on(table.classId),
    index('group_sessions_status_idx').on(table.status),
    index('group_sessions_scheduled_idx').on(table.scheduledAt),
  ]
);

export type GroupSession = typeof groupSessions.$inferSelect;
export type NewGroupSession = typeof groupSessions.$inferInsert;

// GroupSessionRSVPs table - tracks RSVP responses from mentees
export const groupSessionRsvps = pgTable(
  'group_session_rsvps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Foreign key to group session
    groupSessionId: uuid('group_session_id')
      .references(() => groupSessions.id, { onDelete: 'cascade' })
      .notNull(),
    // Foreign key to user (mentee)
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    // RSVP status (pending, accepted, declined)
    status: rsvpStatusEnum('status').notNull().default('pending'),
    // Optional notes from the mentee
    notes: text('notes'),
    // Timestamp when response was given
    respondedAt: timestamp('responded_at'),
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    // Unique constraint on group_session_id + user_id to prevent duplicate RSVPs
    unique('group_session_rsvps_session_user_unique').on(table.groupSessionId, table.userId),
    index('group_session_rsvps_session_idx').on(table.groupSessionId),
    index('group_session_rsvps_user_idx').on(table.userId),
    index('group_session_rsvps_status_idx').on(table.status),
  ]
);

export type GroupSessionRsvp = typeof groupSessionRsvps.$inferSelect;
export type NewGroupSessionRsvp = typeof groupSessionRsvps.$inferInsert;

// Enum for diary entry type
export const diaryEntryTypeEnum = pgEnum('diary_entry_type', ['text', 'voice', 'mixed']);

// Enum for transcription status
export const transcriptionStatusEnum = pgEnum('transcription_status', [
  'pending',
  'processing',
  'completed',
  'failed',
]);

// Enum for transcription language
export const transcriptionLanguageEnum = pgEnum('transcription_language', ['de', 'en']);

// DiaryEntries table - stores mentee journal entries with text and/or voice content
export const diaryEntries = pgTable(
  'diary_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Foreign key to user (mentee)
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    // Entry type (text, voice, or mixed)
    entryType: diaryEntryTypeEnum('entry_type').notNull().default('text'),
    // Text content of the entry
    content: text('content'),
    // Voice recording URL (for voice entries)
    voiceRecordingUrl: text('voice_recording_url'),
    // Voice recording duration in seconds
    voiceRecordingDuration: integer('voice_recording_duration'),
    // Voice transcription text (generated from audio via AI)
    voiceTranscription: text('voice_transcription'),
    // Transcription status
    transcriptionStatus: transcriptionStatusEnum('transcription_status'),
    // Language used for transcription (detected or specified)
    transcriptionLanguage: transcriptionLanguageEnum('transcription_language'),
    // Transcription error message (if failed)
    transcriptionError: text('transcription_error'),
    // Entry date (for filtering and display)
    entryDate: timestamp('entry_date').notNull(),
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('diary_entries_user_idx').on(table.userId),
    index('diary_entries_date_idx').on(table.entryDate),
    index('diary_entries_user_date_idx').on(table.userId, table.entryDate),
  ]
);

export type DiaryEntry = typeof diaryEntries.$inferSelect;
export type NewDiaryEntry = typeof diaryEntries.$inferInsert;

// PushSubscriptions table - stores Web Push API subscriptions for users
export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Foreign key to user
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    // Push subscription endpoint URL
    endpoint: text('endpoint').notNull().unique(),
    // Expiration time (if provided by browser)
    expirationTime: timestamp('expiration_time'),
    // p256dh key for encryption
    p256dh: text('p256dh').notNull(),
    // auth key for encryption
    auth: text('auth').notNull(),
    // User agent for debugging/analytics
    userAgent: text('user_agent'),
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('push_subscriptions_user_idx').on(table.userId),
    index('push_subscriptions_endpoint_idx').on(table.endpoint),
  ]
);

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;

// Enum for notification tone types
export const notificationToneEnum = pgEnum('notification_tone', [
  'default',
  'gentle',
  'chime',
  'alert',
  'silent',
]);

// NotificationSettings table - stores user notification preferences
export const notificationSettings = pgTable(
  'notification_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Foreign key to user
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    // Master toggle for all notifications
    notificationsEnabled: boolean('notifications_enabled').default(true).notNull(),
    // Reminder type toggles
    exerciseRemindersEnabled: boolean('exercise_reminders_enabled').default(true).notNull(),
    sessionRemindersEnabled: boolean('session_reminders_enabled').default(true).notNull(),
    groupSessionRemindersEnabled: boolean('group_session_reminders_enabled').default(true).notNull(),
    dailySummaryEnabled: boolean('daily_summary_enabled').default(false).notNull(),
    // Minutes before event to send reminder
    exerciseReminderMinutes: integer('exercise_reminder_minutes').default(15).notNull(),
    sessionReminderMinutes: integer('session_reminder_minutes').default(30).notNull(),
    groupSessionReminderMinutes: integer('group_session_reminder_minutes').default(60).notNull(),
    // Notification tone preference
    notificationTone: notificationToneEnum('notification_tone').default('default').notNull(),
    // Push notification opt-in status
    pushOptedIn: boolean('push_opted_in').default(false).notNull(),
    // Quiet hours configuration
    quietHoursEnabled: boolean('quiet_hours_enabled').default(false).notNull(),
    quietHoursStart: varchar('quiet_hours_start', { length: 5 }), // HH:MM format
    quietHoursEnd: varchar('quiet_hours_end', { length: 5 }), // HH:MM format
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('notification_settings_user_idx').on(table.userId),
  ]
);

export type NotificationSettings = typeof notificationSettings.$inferSelect;
export type NewNotificationSettings = typeof notificationSettings.$inferInsert;

// Enum for reminder type
export const reminderTypeEnum = pgEnum('reminder_type', [
  'exercise',
  'session',
  'group_session',
]);

// SentReminders table - tracks which reminders have been sent to prevent duplicates
export const sentReminders = pgTable(
  'sent_reminders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Foreign key to user
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    // Type of reminder (exercise, session, group_session)
    reminderType: reminderTypeEnum('reminder_type').notNull(),
    // Reference ID (scheduled_exercise_id, mentoring_session_id, or group_session_id)
    referenceId: uuid('reference_id').notNull(),
    // When the reminder was sent
    sentAt: timestamp('sent_at').defaultNow().notNull(),
    // Tone that was used for this notification
    tonePlayed: notificationToneEnum('tone_played'),
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('sent_reminders_user_idx').on(table.userId),
    index('sent_reminders_reference_idx').on(table.referenceId),
    index('sent_reminders_type_idx').on(table.reminderType),
    // Unique constraint to prevent duplicate reminders
    unique('sent_reminders_user_type_reference_unique').on(
      table.userId,
      table.reminderType,
      table.referenceId
    ),
  ]
);

export type SentReminder = typeof sentReminders.$inferSelect;
export type NewSentReminder = typeof sentReminders.$inferInsert;

// Enum for AI providers
export const aiProviderEnum = pgEnum('ai_provider', ['anthropic', 'gemini']);

// Enum for AI task types (different AI features may use different models)
export const aiTaskTypeEnum = pgEnum('ai_task_type', [
  'chat',
  'summarization',
  'translation',
  'content_generation',
  'analysis',
  'transcription',
]);

// AISettings table - stores AI configuration per tenant
export const aiSettings = pgTable(
  'ai_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Tenant association - one AI settings record per tenant
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    // Default provider for the tenant
    defaultProvider: aiProviderEnum('default_provider').default('anthropic').notNull(),
    // Encrypted API keys stored as text (encrypted at application level)
    anthropicApiKeyEncrypted: text('anthropic_api_key_encrypted'),
    geminiApiKeyEncrypted: text('gemini_api_key_encrypted'),
    // Model configuration per task type stored as JSONB
    // Structure: { [taskType]: { provider: string, model: string } }
    modelConfig: jsonb('model_config').$type<{
      chat?: { provider: 'anthropic' | 'gemini'; model: string };
      summarization?: { provider: 'anthropic' | 'gemini'; model: string };
      translation?: { provider: 'anthropic' | 'gemini'; model: string };
      content_generation?: { provider: 'anthropic' | 'gemini'; model: string };
      analysis?: { provider: 'anthropic' | 'gemini'; model: string };
      transcription?: { provider: 'anthropic' | 'gemini'; model: string };
    }>().default({}).notNull(),
    // Feature flags
    aiEnabled: boolean('ai_enabled').default(false).notNull(),
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('ai_settings_tenant_idx').on(table.tenantId),
  ]
);

export type AISettings = typeof aiSettings.$inferSelect;
export type NewAISettings = typeof aiSettings.$inferInsert;

// Type for model configuration
export type AIModelConfig = {
  chat?: { provider: 'anthropic' | 'gemini'; model: string };
  summarization?: { provider: 'anthropic' | 'gemini'; model: string };
  translation?: { provider: 'anthropic' | 'gemini'; model: string };
  content_generation?: { provider: 'anthropic' | 'gemini'; model: string };
  analysis?: { provider: 'anthropic' | 'gemini'; model: string };
  transcription?: { provider: 'anthropic' | 'gemini'; model: string };
};

// AIUsageLog table - tracks AI API usage per tenant for statistics
export const aiUsageLogs = pgTable(
  'ai_usage_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Tenant association
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    // User who triggered the AI call (optional for system calls)
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'set null' }),
    // Provider used
    provider: aiProviderEnum('provider').notNull(),
    // Model used
    model: varchar('model', { length: 100 }).notNull(),
    // Task type
    taskType: aiTaskTypeEnum('task_type').notNull(),
    // Token usage
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    totalTokens: integer('total_tokens').notNull().default(0),
    // Estimated cost in cents (USD)
    estimatedCostCents: integer('estimated_cost_cents').notNull().default(0),
    // Duration in milliseconds
    durationMs: integer('duration_ms'),
    // Request status
    success: boolean('success').notNull().default(true),
    errorMessage: text('error_message'),
    // Timestamp
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('ai_usage_logs_tenant_idx').on(table.tenantId),
    index('ai_usage_logs_user_idx').on(table.userId),
    index('ai_usage_logs_provider_idx').on(table.provider),
    index('ai_usage_logs_task_type_idx').on(table.taskType),
    index('ai_usage_logs_created_at_idx').on(table.createdAt),
    index('ai_usage_logs_tenant_created_idx').on(table.tenantId, table.createdAt),
  ]
);

export type AIUsageLog = typeof aiUsageLogs.$inferSelect;
export type NewAIUsageLog = typeof aiUsageLogs.$inferInsert;

// Enum for translation languages
export const translationLanguageEnum = pgEnum('translation_language', ['de', 'en']);

// TranslationPrompts table - stores customizable translation prompts per tenant
export const translationPrompts = pgTable(
  'translation_prompts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Tenant association - prompts are tenant-scoped
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    // Source and target languages
    sourceLang: translationLanguageEnum('source_lang').notNull(),
    targetLang: translationLanguageEnum('target_lang').notNull(),
    // Prompt configuration
    name: varchar('name', { length: 255 }).notNull(),
    // The prompt template with placeholders: {{text}}, {{context}}
    promptTemplate: text('prompt_template').notNull(),
    // Whether this prompt is active (used for translations)
    isActive: boolean('is_active').default(true).notNull(),
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('translation_prompts_tenant_idx').on(table.tenantId),
    index('translation_prompts_lang_pair_idx').on(table.sourceLang, table.targetLang),
    // Unique constraint: one prompt per tenant per language pair
    unique('translation_prompts_tenant_lang_unique').on(
      table.tenantId,
      table.sourceLang,
      table.targetLang
    ),
  ]
);

export type TranslationPrompt = typeof translationPrompts.$inferSelect;
export type NewTranslationPrompt = typeof translationPrompts.$inferInsert;

// Enum for context generation types (herkunft = background/origin, ziel = goal/purpose)
export const contextTypeEnum = pgEnum('context_type', ['herkunft', 'ziel']);

// ContextGenerationPrompts table - stores customizable prompts for generating Herkunft and Ziel fields
export const contextGenerationPrompts = pgTable(
  'context_generation_prompts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Tenant association - prompts are tenant-scoped
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    // Context type (herkunft or ziel)
    contextType: contextTypeEnum('context_type').notNull(),
    // Language for the generated content
    language: translationLanguageEnum('language').notNull(),
    // Prompt configuration
    name: varchar('name', { length: 255 }).notNull(),
    // The prompt template with placeholders: {{description}}, {{title}}, {{additionalContext}}
    promptTemplate: text('prompt_template').notNull(),
    // Whether this prompt is active (used for generation)
    isActive: boolean('is_active').default(true).notNull(),
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('context_generation_prompts_tenant_idx').on(table.tenantId),
    index('context_generation_prompts_type_lang_idx').on(table.contextType, table.language),
    // Unique constraint: one prompt per tenant per context type per language
    unique('context_generation_prompts_tenant_type_lang_unique').on(
      table.tenantId,
      table.contextType,
      table.language
    ),
  ]
);

export type ContextGenerationPrompt = typeof contextGenerationPrompts.$inferSelect;
export type NewContextGenerationPrompt = typeof contextGenerationPrompts.$inferInsert;

// Enum for AI prompt categories - groups prompts by their use case
export const aiPromptCategoryEnum = pgEnum('ai_prompt_category', [
  'translation',
  'context_generation',
  'summarization',
  'chat',
  'analysis',
  'transcription',
  'custom',
]);

// AIPrompts table - unified table for all AI prompts used throughout the system
export const aiPrompts = pgTable(
  'ai_prompts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Tenant association - prompts are tenant-scoped
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    // Unique key for the prompt (e.g., 'translation-de-en', 'context-herkunft-de')
    promptKey: varchar('prompt_key', { length: 100 }).notNull(),
    // Display name for the admin UI
    name: varchar('name', { length: 255 }).notNull(),
    // Description of what this prompt does
    description: text('description'),
    // Category of the prompt
    category: aiPromptCategoryEnum('category').notNull(),
    // The prompt template with placeholders (e.g., {{text}}, {{context}})
    promptTemplate: text('prompt_template').notNull(),
    // System message (optional - for models that support it)
    systemMessage: text('system_message'),
    // Default prompt template (stored for reset functionality)
    defaultPromptTemplate: text('default_prompt_template').notNull(),
    // Default system message (stored for reset functionality)
    defaultSystemMessage: text('default_system_message'),
    // Whether this prompt is active (used in the system)
    isActive: boolean('is_active').default(true).notNull(),
    // Whether this is a system prompt (cannot be deleted, only modified)
    isSystem: boolean('is_system').default(false).notNull(),
    // Variables available in this prompt template (stored as JSON array)
    variables: jsonb('variables').$type<string[]>().default([]).notNull(),
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('ai_prompts_tenant_idx').on(table.tenantId),
    index('ai_prompts_category_idx').on(table.category),
    index('ai_prompts_key_idx').on(table.promptKey),
    // Unique constraint: one prompt per tenant per key
    unique('ai_prompts_tenant_key_unique').on(table.tenantId, table.promptKey),
  ]
);

export type AIPrompt = typeof aiPrompts.$inferSelect;
export type NewAIPrompt = typeof aiPrompts.$inferInsert;

// Measurements table - tracks mentee progress metrics per week
export const measurements = pgTable(
  'measurements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Foreign key to user (mentee)
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    // Foreign key to week (tracks which week this measurement is for)
    weekId: uuid('week_id')
      .references(() => weeks.id, { onDelete: 'cascade' })
      .notNull(),
    // Measurement type (references the week's measurement type for validation)
    measurementType: measurementTypeEnum('measurement_type').notNull(),
    // Numeric value storage - using decimal for precision with scale/percentage values
    value: decimal('value', { precision: 10, scale: 2 }).notNull(),
    // Optional notes about the measurement
    notes: text('notes'),
    // Created timestamp for tracking when measurement was recorded
    createdAt: timestamp('created_at').defaultNow().notNull(),
    // Updated timestamp
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('measurements_user_idx').on(table.userId),
    index('measurements_week_idx').on(table.weekId),
    index('measurements_user_week_idx').on(table.userId, table.weekId),
    index('measurements_created_at_idx').on(table.createdAt),
    index('measurements_type_idx').on(table.measurementType),
  ]
);

export type Measurement = typeof measurements.$inferSelect;
export type NewMeasurement = typeof measurements.$inferInsert;

// Enum for pattern types (emotional tracking)
export const patternTypeEnum = pgEnum('pattern_type', [
  'stress',
  'energy',
  'mood',
  'focus',
  'anxiety',
  'motivation',
]);

// Enum for pattern intensity levels
export const patternIntensityEnum = pgEnum('pattern_intensity', ['strong', 'weak', 'none']);

// PatternEntries table - tracks emotional patterns by time blocks (hourly)
export const patternEntries = pgTable(
  'pattern_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Foreign key to user (mentee)
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    // The date for this pattern entry
    entryDate: timestamp('entry_date').notNull(),
    // The hour of the day (0-23)
    hour: integer('hour').notNull(),
    // Pattern type (stress, energy, mood, etc.)
    patternType: patternTypeEnum('pattern_type').notNull(),
    // Intensity level (strong, weak, none)
    intensity: patternIntensityEnum('intensity').notNull(),
    // Optional notes for context
    notes: text('notes'),
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('pattern_entries_user_idx').on(table.userId),
    index('pattern_entries_date_idx').on(table.entryDate),
    index('pattern_entries_user_date_idx').on(table.userId, table.entryDate),
    index('pattern_entries_type_idx').on(table.patternType),
    // Unique constraint: one entry per user per date per hour per pattern type
    unique('pattern_entries_user_date_hour_type_unique').on(
      table.userId,
      table.entryDate,
      table.hour,
      table.patternType
    ),
  ]
);

export type PatternEntry = typeof patternEntries.$inferSelect;
export type NewPatternEntry = typeof patternEntries.$inferInsert;
