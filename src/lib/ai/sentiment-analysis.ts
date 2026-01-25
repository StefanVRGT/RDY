import { db } from '@/lib/db';
import { aiSettings, aiUsageLogs, diaryEntries, users } from '@/lib/db/schema';
import { decryptApiKey } from '@/lib/crypto/encryption';
import { eq } from 'drizzle-orm';

// Supported languages for sentiment analysis
export type SentimentLanguage = 'de' | 'en';

// Sentiment score range: -1 (very negative) to 1 (very positive)
export type SentimentScore = number;

// Sentiment label categories
export type SentimentLabel =
  | 'very_negative'
  | 'negative'
  | 'neutral'
  | 'positive'
  | 'very_positive';

// Emotion categories commonly detected in diary entries
export type EmotionCategory =
  | 'joy'
  | 'sadness'
  | 'anger'
  | 'fear'
  | 'surprise'
  | 'disgust'
  | 'trust'
  | 'anticipation'
  | 'anxiety'
  | 'contentment'
  | 'frustration'
  | 'hope'
  | 'loneliness'
  | 'gratitude'
  | 'stress'
  | 'calm';

// Individual emotion with intensity
export interface EmotionScore {
  emotion: EmotionCategory;
  intensity: number; // 0 to 1
  confidence: number; // 0 to 1
}

// Emotional pattern identified in text
export interface EmotionalPattern {
  pattern: string;
  description: string;
  frequency: number;
  sentiment: 'positive' | 'negative' | 'neutral';
}

// Keyword extracted from text with sentiment context
export interface SentimentKeyword {
  keyword: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  weight: number; // 0 to 1, indicating importance
}

// Mood barometer data point
export interface MoodBarometerData {
  overallMood: SentimentLabel;
  moodScore: number; // -100 to 100 for easier visualization
  dominantEmotion: EmotionCategory;
  emotionIntensity: number; // 0 to 100
  energyLevel: 'low' | 'medium' | 'high';
  stressIndicator: 'low' | 'moderate' | 'high';
  recommendedAction?: string;
}

// Complete sentiment analysis result
export interface SentimentAnalysisResult {
  success: boolean;
  // Core sentiment data
  sentimentScore?: SentimentScore;
  sentimentLabel?: SentimentLabel;
  confidence?: number;
  // Emotional analysis
  emotions?: EmotionScore[];
  dominantEmotion?: EmotionCategory;
  // Patterns and keywords
  emotionalPatterns?: EmotionalPattern[];
  keywords?: SentimentKeyword[];
  // Mood barometer
  moodBarometer?: MoodBarometerData;
  // Metadata
  language?: SentimentLanguage;
  analyzedText?: string;
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  durationMs?: number;
}

// Configuration for sentiment analysis request
export interface SentimentAnalysisConfig {
  tenantId: string;
  userId: string;
  text: string;
  diaryEntryId?: string;
  language?: SentimentLanguage;
  context?: string; // Optional context like "diary entry about work" or "personal reflection"
}

// Default sentiment analysis prompts for each language
export const DEFAULT_SENTIMENT_PROMPTS = {
  de: `Du bist ein Experte für Sentimentanalyse und emotionale Intelligenz, spezialisiert auf die Analyse von Tagebucheinträgen.

Analysiere den folgenden Text auf Stimmung, Emotionen und mentale Gesundheitsindikatoren.

{{#if context}}
Kontext: {{context}}
{{/if}}

Text zur Analyse:
{{text}}

Antworte ausschließlich mit validem JSON im folgenden Format (ohne zusätzlichen Text oder Markdown):
{
  "sentimentScore": <Zahl zwischen -1 (sehr negativ) und 1 (sehr positiv)>,
  "sentimentLabel": "<very_negative|negative|neutral|positive|very_positive>",
  "confidence": <Zahl zwischen 0 und 1>,
  "emotions": [
    {
      "emotion": "<joy|sadness|anger|fear|surprise|disgust|trust|anticipation|anxiety|contentment|frustration|hope|loneliness|gratitude|stress|calm>",
      "intensity": <Zahl zwischen 0 und 1>,
      "confidence": <Zahl zwischen 0 und 1>
    }
  ],
  "dominantEmotion": "<die stärkste erkannte Emotion>",
  "emotionalPatterns": [
    {
      "pattern": "<erkanntes Muster>",
      "description": "<Beschreibung des Musters>",
      "frequency": <wie oft es vorkommt>,
      "sentiment": "<positive|negative|neutral>"
    }
  ],
  "keywords": [
    {
      "keyword": "<emotionales Schlüsselwort>",
      "sentiment": "<positive|negative|neutral>",
      "weight": <Wichtigkeit 0-1>
    }
  ],
  "moodBarometer": {
    "overallMood": "<very_negative|negative|neutral|positive|very_positive>",
    "moodScore": <Zahl zwischen -100 und 100>,
    "dominantEmotion": "<stärkste Emotion>",
    "emotionIntensity": <0-100>,
    "energyLevel": "<low|medium|high>",
    "stressIndicator": "<low|moderate|high>",
    "recommendedAction": "<optionale Empfehlung für Selbstfürsorge>"
  }
}`,

  en: `You are an expert in sentiment analysis and emotional intelligence, specialized in analyzing diary entries.

Analyze the following text for mood, emotions, and mental health indicators.

{{#if context}}
Context: {{context}}
{{/if}}

Text to analyze:
{{text}}

Respond only with valid JSON in the following format (no additional text or markdown):
{
  "sentimentScore": <number between -1 (very negative) and 1 (very positive)>,
  "sentimentLabel": "<very_negative|negative|neutral|positive|very_positive>",
  "confidence": <number between 0 and 1>,
  "emotions": [
    {
      "emotion": "<joy|sadness|anger|fear|surprise|disgust|trust|anticipation|anxiety|contentment|frustration|hope|loneliness|gratitude|stress|calm>",
      "intensity": <number between 0 and 1>,
      "confidence": <number between 0 and 1>
    }
  ],
  "dominantEmotion": "<the strongest detected emotion>",
  "emotionalPatterns": [
    {
      "pattern": "<identified pattern>",
      "description": "<description of the pattern>",
      "frequency": <how often it appears>,
      "sentiment": "<positive|negative|neutral>"
    }
  ],
  "keywords": [
    {
      "keyword": "<emotional keyword>",
      "sentiment": "<positive|negative|neutral>",
      "weight": <importance 0-1>
    }
  ],
  "moodBarometer": {
    "overallMood": "<very_negative|negative|neutral|positive|very_positive>",
    "moodScore": <number between -100 and 100>,
    "dominantEmotion": "<strongest emotion>",
    "emotionIntensity": <0-100>,
    "energyLevel": "<low|medium|high>",
    "stressIndicator": "<low|moderate|high>",
    "recommendedAction": "<optional self-care recommendation>"
  }
}`,
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
 * Build the sentiment analysis prompt with variables replaced
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
 * Simple language detection based on common German words and patterns
 */
function detectLanguage(text: string): SentimentLanguage {
  const germanPatterns = [
    /\b(und|oder|aber|nicht|ich|du|er|sie|es|wir|ihr|sein|haben|werden|können|müssen)\b/gi,
    /\b(der|die|das|ein|eine|einer|eines|einem|einen)\b/gi,
    /\b(auf|an|in|mit|für|von|zu|bei|nach|über|unter|vor|hinter|neben|zwischen)\b/gi,
    /ä|ö|ü|ß/gi,
  ];

  let germanScore = 0;
  for (const pattern of germanPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      germanScore += matches.length;
    }
  }

  const normalizedScore = germanScore / (text.split(/\s+/).length || 1);
  return normalizedScore > 0.15 ? 'de' : 'en';
}

/**
 * Log AI usage for a sentiment analysis request
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
    taskType: 'analysis',
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
 * Parse sentiment analysis JSON response from AI
 */
function parseSentimentResponse(responseText: string): Partial<SentimentAnalysisResult> {
  try {
    // Try to extract JSON from the response (in case there's surrounding text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and normalize the response
    const result: Partial<SentimentAnalysisResult> = {
      sentimentScore:
        typeof parsed.sentimentScore === 'number'
          ? Math.max(-1, Math.min(1, parsed.sentimentScore))
          : 0,
      sentimentLabel: validateSentimentLabel(parsed.sentimentLabel),
      confidence:
        typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
      emotions: validateEmotions(parsed.emotions),
      dominantEmotion: validateEmotionCategory(parsed.dominantEmotion),
      emotionalPatterns: validateEmotionalPatterns(parsed.emotionalPatterns),
      keywords: validateKeywords(parsed.keywords),
      moodBarometer: validateMoodBarometer(parsed.moodBarometer),
    };

    return result;
  } catch (error) {
    throw new Error(
      `Failed to parse sentiment response: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Validate sentiment label
 */
function validateSentimentLabel(label: unknown): SentimentLabel {
  const validLabels: SentimentLabel[] = [
    'very_negative',
    'negative',
    'neutral',
    'positive',
    'very_positive',
  ];
  if (typeof label === 'string' && validLabels.includes(label as SentimentLabel)) {
    return label as SentimentLabel;
  }
  return 'neutral';
}

/**
 * Validate emotion category
 */
function validateEmotionCategory(category: unknown): EmotionCategory {
  const validCategories: EmotionCategory[] = [
    'joy',
    'sadness',
    'anger',
    'fear',
    'surprise',
    'disgust',
    'trust',
    'anticipation',
    'anxiety',
    'contentment',
    'frustration',
    'hope',
    'loneliness',
    'gratitude',
    'stress',
    'calm',
  ];
  if (typeof category === 'string' && validCategories.includes(category as EmotionCategory)) {
    return category as EmotionCategory;
  }
  return 'neutral' as unknown as EmotionCategory; // Default fallback
}

/**
 * Validate emotions array
 */
function validateEmotions(emotions: unknown): EmotionScore[] {
  if (!Array.isArray(emotions)) return [];

  return emotions
    .filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null)
    .map((e) => ({
      emotion: validateEmotionCategory(e.emotion),
      intensity: typeof e.intensity === 'number' ? Math.max(0, Math.min(1, e.intensity)) : 0.5,
      confidence: typeof e.confidence === 'number' ? Math.max(0, Math.min(1, e.confidence)) : 0.5,
    }))
    .slice(0, 10); // Limit to 10 emotions
}

/**
 * Validate emotional patterns
 */
function validateEmotionalPatterns(patterns: unknown): EmotionalPattern[] {
  if (!Array.isArray(patterns)) return [];

  return patterns
    .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
    .map((p) => ({
      pattern: typeof p.pattern === 'string' ? p.pattern.slice(0, 200) : '',
      description: typeof p.description === 'string' ? p.description.slice(0, 500) : '',
      frequency: typeof p.frequency === 'number' ? Math.max(0, p.frequency) : 1,
      sentiment: validatePatternSentiment(p.sentiment),
    }))
    .filter((p) => p.pattern.length > 0)
    .slice(0, 10); // Limit to 10 patterns
}

/**
 * Validate pattern sentiment
 */
function validatePatternSentiment(sentiment: unknown): 'positive' | 'negative' | 'neutral' {
  const validSentiments = ['positive', 'negative', 'neutral'];
  if (typeof sentiment === 'string' && validSentiments.includes(sentiment)) {
    return sentiment as 'positive' | 'negative' | 'neutral';
  }
  return 'neutral';
}

/**
 * Validate keywords
 */
function validateKeywords(keywords: unknown): SentimentKeyword[] {
  if (!Array.isArray(keywords)) return [];

  return keywords
    .filter((k): k is Record<string, unknown> => typeof k === 'object' && k !== null)
    .map((k) => ({
      keyword: typeof k.keyword === 'string' ? k.keyword.slice(0, 100) : '',
      sentiment: validatePatternSentiment(k.sentiment),
      weight: typeof k.weight === 'number' ? Math.max(0, Math.min(1, k.weight)) : 0.5,
    }))
    .filter((k) => k.keyword.length > 0)
    .slice(0, 20); // Limit to 20 keywords
}

/**
 * Validate mood barometer
 */
function validateMoodBarometer(barometer: unknown): MoodBarometerData | undefined {
  if (typeof barometer !== 'object' || barometer === null) return undefined;

  const b = barometer as Record<string, unknown>;

  return {
    overallMood: validateSentimentLabel(b.overallMood),
    moodScore: typeof b.moodScore === 'number' ? Math.max(-100, Math.min(100, b.moodScore)) : 0,
    dominantEmotion: validateEmotionCategory(b.dominantEmotion),
    emotionIntensity:
      typeof b.emotionIntensity === 'number' ? Math.max(0, Math.min(100, b.emotionIntensity)) : 50,
    energyLevel: validateEnergyLevel(b.energyLevel),
    stressIndicator: validateStressIndicator(b.stressIndicator),
    recommendedAction:
      typeof b.recommendedAction === 'string' ? b.recommendedAction.slice(0, 500) : undefined,
  };
}

/**
 * Validate energy level
 */
function validateEnergyLevel(level: unknown): 'low' | 'medium' | 'high' {
  const validLevels = ['low', 'medium', 'high'];
  if (typeof level === 'string' && validLevels.includes(level)) {
    return level as 'low' | 'medium' | 'high';
  }
  return 'medium';
}

/**
 * Validate stress indicator
 */
function validateStressIndicator(indicator: unknown): 'low' | 'moderate' | 'high' {
  const validIndicators = ['low', 'moderate', 'high'];
  if (typeof indicator === 'string' && validIndicators.includes(indicator)) {
    return indicator as 'low' | 'moderate' | 'high';
  }
  return 'moderate';
}

/**
 * Analyze sentiment using Anthropic Claude
 */
async function analyzeWithAnthropic(
  apiKey: string,
  model: string,
  prompt: string
): Promise<SentimentAnalysisResult> {
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
        max_tokens: 4096,
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

    const responseText = data.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    try {
      const parsedResult = parseSentimentResponse(responseText);

      return {
        success: true,
        ...parsedResult,
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        durationMs,
      };
    } catch (parseError) {
      return {
        success: false,
        error: parseError instanceof Error ? parseError.message : 'Failed to parse response',
        durationMs,
      };
    }
  } catch (error) {
    const durationMs = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during sentiment analysis',
      durationMs,
    };
  }
}

/**
 * Analyze sentiment using Google Gemini
 */
async function analyzeWithGemini(
  apiKey: string,
  model: string,
  prompt: string
): Promise<SentimentAnalysisResult> {
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
            maxOutputTokens: 4096,
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
      usageMetadata?: {
        promptTokenCount: number;
        candidatesTokenCount: number;
        totalTokenCount: number;
      };
    };

    const responseText =
      data.candidates?.[0]?.content?.parts
        ?.filter((part) => part.text)
        .map((part) => part.text)
        .join('\n')
        .trim() || '';

    try {
      const parsedResult = parseSentimentResponse(responseText);

      return {
        success: true,
        ...parsedResult,
        inputTokens: data.usageMetadata?.promptTokenCount || 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
        durationMs,
      };
    } catch (parseError) {
      return {
        success: false,
        error: parseError instanceof Error ? parseError.message : 'Failed to parse response',
        durationMs,
      };
    }
  } catch (error) {
    const durationMs = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during sentiment analysis',
      durationMs,
    };
  }
}

/**
 * Main sentiment analysis function - uses tenant's AI configuration
 */
export async function analyzeSentiment(
  config: SentimentAnalysisConfig
): Promise<SentimentAnalysisResult> {
  const { tenantId, userId, text, language, context } = config;

  // Validate text is not empty
  if (!text || text.trim().length === 0) {
    return {
      success: false,
      error: 'Text is required for sentiment analysis',
    };
  }

  // Get tenant AI settings
  const aiConfig = await getTenantAIConfig(tenantId);

  if (!aiConfig) {
    return {
      success: false,
      error: 'AI settings not configured for this tenant',
    };
  }

  if (!aiConfig.aiEnabled) {
    return {
      success: false,
      error: 'AI features are disabled for this tenant',
    };
  }

  // Determine which provider and model to use
  const analysisConfig = (
    aiConfig.modelConfig as Record<
      string,
      { provider: 'anthropic' | 'gemini'; model: string } | undefined
    >
  )?.analysis;
  const provider = analysisConfig?.provider || aiConfig.defaultProvider;
  const model =
    analysisConfig?.model ||
    (provider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gemini-1.5-flash');

  // Get the API key for the selected provider
  const apiKey = provider === 'anthropic' ? aiConfig.anthropicApiKey : aiConfig.geminiApiKey;

  if (!apiKey) {
    return {
      success: false,
      error: `No API key configured for ${provider}`,
    };
  }

  // Detect or use provided language
  const detectedLanguage = language || detectLanguage(text);

  // Get the appropriate prompt template
  const promptTemplate = DEFAULT_SENTIMENT_PROMPTS[detectedLanguage];
  const prompt = buildPrompt(promptTemplate, text, context);

  // Perform sentiment analysis based on provider
  let result: SentimentAnalysisResult;
  if (provider === 'anthropic') {
    result = await analyzeWithAnthropic(apiKey, model, prompt);
  } else {
    result = await analyzeWithGemini(apiKey, model, prompt);
  }

  // Add language and analyzed text to result
  result.language = detectedLanguage;
  result.analyzedText = text;

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
 * Analyze a diary entry's content for sentiment
 */
export async function analyzeDiaryEntrySentiment(
  diaryEntryId: string,
  tenantId: string,
  userId: string,
  language?: SentimentLanguage
): Promise<SentimentAnalysisResult> {
  // Get the diary entry
  const [entry] = await db
    .select({
      id: diaryEntries.id,
      content: diaryEntries.content,
      entryType: diaryEntries.entryType,
    })
    .from(diaryEntries)
    .where(eq(diaryEntries.id, diaryEntryId))
    .limit(1);

  if (!entry) {
    return {
      success: false,
      error: 'Diary entry not found',
    };
  }

  // Use the text content (or transcription for voice entries)
  const textToAnalyze = entry.content;

  if (!textToAnalyze || textToAnalyze.trim().length === 0) {
    return {
      success: false,
      error: 'No text content found for analysis',
    };
  }

  // Perform sentiment analysis
  return await analyzeSentiment({
    tenantId,
    userId,
    text: textToAnalyze,
    diaryEntryId,
    language,
    context: entry.entryType === 'voice' ? 'transcribed voice diary entry' : 'text diary entry',
  });
}

/**
 * Get user's tenant ID
 */
export async function getUserTenantId(userId: string): Promise<string | null> {
  const [user] = await db
    .select({ tenantId: users.tenantId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user?.tenantId || null;
}

/**
 * Calculate aggregate sentiment from multiple analysis results
 */
export function aggregateSentimentResults(results: SentimentAnalysisResult[]): {
  averageSentiment: number;
  averageMood: SentimentLabel;
  dominantEmotions: EmotionCategory[];
  overallStress: 'low' | 'moderate' | 'high';
  trendDirection: 'improving' | 'stable' | 'declining';
} {
  const successfulResults = results.filter((r) => r.success && r.sentimentScore !== undefined);

  if (successfulResults.length === 0) {
    return {
      averageSentiment: 0,
      averageMood: 'neutral',
      dominantEmotions: [],
      overallStress: 'moderate',
      trendDirection: 'stable',
    };
  }

  // Calculate average sentiment
  const averageSentiment =
    successfulResults.reduce((sum, r) => sum + (r.sentimentScore || 0), 0) /
    successfulResults.length;

  // Determine average mood label
  const averageMood = sentimentScoreToLabel(averageSentiment);

  // Find dominant emotions across all results
  const emotionCounts = new Map<EmotionCategory, number>();
  successfulResults.forEach((r) => {
    if (r.dominantEmotion) {
      emotionCounts.set(r.dominantEmotion, (emotionCounts.get(r.dominantEmotion) || 0) + 1);
    }
  });
  const dominantEmotions = Array.from(emotionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([emotion]) => emotion);

  // Calculate overall stress
  const stressIndicators = successfulResults
    .map((r) => r.moodBarometer?.stressIndicator)
    .filter((s): s is 'low' | 'moderate' | 'high' => s !== undefined);

  const stressScore =
    stressIndicators.reduce((sum, s) => {
      if (s === 'low') return sum;
      if (s === 'moderate') return sum + 1;
      return sum + 2;
    }, 0) / (stressIndicators.length || 1);

  const overallStress: 'low' | 'moderate' | 'high' =
    stressScore < 0.5 ? 'low' : stressScore < 1.5 ? 'moderate' : 'high';

  // Calculate trend (comparing first half vs second half)
  let trendDirection: 'improving' | 'stable' | 'declining' = 'stable';
  if (successfulResults.length >= 2) {
    const midpoint = Math.floor(successfulResults.length / 2);
    const firstHalf = successfulResults.slice(0, midpoint);
    const secondHalf = successfulResults.slice(midpoint);

    const firstAvg =
      firstHalf.reduce((sum, r) => sum + (r.sentimentScore || 0), 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, r) => sum + (r.sentimentScore || 0), 0) / secondHalf.length;

    const difference = secondAvg - firstAvg;
    if (difference > 0.1) trendDirection = 'improving';
    else if (difference < -0.1) trendDirection = 'declining';
  }

  return {
    averageSentiment,
    averageMood,
    dominantEmotions,
    overallStress,
    trendDirection,
  };
}

/**
 * Convert sentiment score to label
 */
export function sentimentScoreToLabel(score: number): SentimentLabel {
  if (score <= -0.6) return 'very_negative';
  if (score <= -0.2) return 'negative';
  if (score <= 0.2) return 'neutral';
  if (score <= 0.6) return 'positive';
  return 'very_positive';
}

/**
 * Convert sentiment label to score (midpoint)
 */
export function sentimentLabelToScore(label: SentimentLabel): number {
  switch (label) {
    case 'very_negative':
      return -0.8;
    case 'negative':
      return -0.4;
    case 'neutral':
      return 0;
    case 'positive':
      return 0.4;
    case 'very_positive':
      return 0.8;
    default:
      return 0;
  }
}
