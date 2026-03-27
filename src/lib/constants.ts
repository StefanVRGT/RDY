/**
 * Application-wide constants — single source of truth for magic values.
 * Import from here instead of scattering literals across the codebase.
 */

// ---------------------------------------------------------------------------
// User roles
// ---------------------------------------------------------------------------
export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  MENTOR: 'mentor',
  MENTEE: 'mentee',
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];
export const ALL_ROLES = Object.values(ROLES) as AppRole[];

// ---------------------------------------------------------------------------
// Pattern tracking
// ---------------------------------------------------------------------------
export const PATTERN_TYPES = [
  'stress',
  'energy',
  'mood',
  'focus',
  'anxiety',
  'motivation',
] as const;
export type PatternType = (typeof PATTERN_TYPES)[number];

export const INTENSITY_LEVELS = ['strong', 'weak', 'none'] as const;
export type IntensityLevel = (typeof INTENSITY_LEVELS)[number];

// ---------------------------------------------------------------------------
// Mood scoring (0–100 scale)
// ---------------------------------------------------------------------------
export const MOOD_NEUTRAL_SCORE = 50;

// ---------------------------------------------------------------------------
// Time constants
// ---------------------------------------------------------------------------
export const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const MS_PER_WEEK = 7 * MS_PER_DAY;
export const WEEKS_PER_MONTH = 4;

// ---------------------------------------------------------------------------
// RDY Program structure
// ---------------------------------------------------------------------------
export const DAYS_PER_LEVEL = 21;        // 20 active + 1 rest
export const WEEKS_PER_LEVEL = 3;
export const ACTIVE_DAYS_PER_LEVEL = 20;
export const REST_DAY_OFFSET = 20;       // day 21 (0-indexed: 20) is rest
export const TOTAL_LEVELS = 5;
export const PROGRAM_DAYS = DAYS_PER_LEVEL * TOTAL_LEVELS; // 105

// ---------------------------------------------------------------------------
// Session constraints
// ---------------------------------------------------------------------------
export const SESSION_MIN_DURATION_MINUTES = 15;
export const SESSION_MAX_DURATION_MINUTES = 480; // 8 hours
export const SESSION_DEFAULT_DURATION_MINUTES = 60;
export const GROUP_SESSION_MAX_DURATION_MINUTES = 480;

// ---------------------------------------------------------------------------
// Invitation constraints
// ---------------------------------------------------------------------------
export const INVITATION_DEFAULT_EXPIRY_DAYS = 7;
export const INVITATION_MAX_EXPIRY_DAYS = 30;

// ---------------------------------------------------------------------------
// Analytics / alerting thresholds
// ---------------------------------------------------------------------------
/** Completion rate below this % triggers a low-completion alert */
export const ANALYTICS_LOW_COMPLETION_RATE = 50;
/** Mood score below this triggers a low-mood alert */
export const ANALYTICS_LOW_MOOD_SCORE = 40;
/** Number of flags that classify a mentee as high-priority */
export const ANALYTICS_HIGH_PRIORITY_FLAGS = 3;
/** Days without activity before a mentee is considered inactive */
export const ANALYTICS_DEFAULT_INACTIVE_DAYS = 7;
/** Rolling window used for mood trend analysis */
export const ANALYTICS_MOOD_ANALYSIS_DAYS = 14;
/** Default date range (days) when no explicit range is given */
export const ANALYTICS_DEFAULT_RANGE_DAYS = 30;

// ---------------------------------------------------------------------------
// Auth / sessions
// ---------------------------------------------------------------------------
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days
