/**
 * AI provider configuration constants.
 * All API endpoints, versions, token limits, and pricing live here.
 */

// ---------------------------------------------------------------------------
// Anthropic (Claude)
// ---------------------------------------------------------------------------
export const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
export const ANTHROPIC_API_VERSION = '2023-06-01';

/** Default model used when tenant ai_settings are not yet configured */
export const ANTHROPIC_DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';
/** Fast/cheap model used for connectivity pings and prompt test calls */
export const ANTHROPIC_TEST_MODEL = 'claude-3-5-haiku-20241022';

// ---------------------------------------------------------------------------
// Google Gemini
// ---------------------------------------------------------------------------
export const GEMINI_API_BASE_URL = (model: string, apiKey: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

/** Default model used when tenant ai_settings are not yet configured */
export const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash-preview-04-17';
/** Fast/cheap model used for connectivity pings and prompt test calls */
export const GEMINI_TEST_MODEL = 'gemini-2.5-flash-preview-04-17';

// ---------------------------------------------------------------------------
// Token limits (per task type)
// ---------------------------------------------------------------------------
/** Standard max tokens for most generative tasks (translation, transcription, analysis) */
export const AI_MAX_TOKENS_DEFAULT = 4096;
/** Reduced limit for short-output tasks like context generation */
export const AI_MAX_TOKENS_SHORT = 1024;
/** Minimal tokens for ping/connectivity tests — just needs any response */
export const AI_MAX_TOKENS_PING = 10;

// ---------------------------------------------------------------------------
// Pricing (cents per 1 000 000 tokens)
// Used for estimating cost in ai_usage_logs; update when pricing changes.
// ---------------------------------------------------------------------------
export const AI_PRICING = {
  anthropic: {
    /** Claude Sonnet: ~$3/1M input */
    inputCentsPerMToken: 0.3,
    /** Claude Sonnet: ~$15/1M output */
    outputCentsPerMToken: 1.5,
  },
  gemini: {
    /** Gemini Pro: ~$0.35/1M input */
    inputCentsPerMToken: 0.035,
    /** Gemini Pro: ~$1.05/1M output */
    outputCentsPerMToken: 0.105,
  },
} as const;
