import { db } from '@/lib/db';
import { aiSettings, aiUsageLogs, diaryEntries, users } from '@/lib/db/schema';
import { decryptApiKey } from '@/lib/crypto/encryption';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

// Supported languages for transcription
export type TranscriptionLanguage = 'de' | 'en';

// Transcription result type
export interface TranscriptionResult {
  success: boolean;
  transcription?: string;
  language?: TranscriptionLanguage;
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  durationMs?: number;
}

// Configuration for transcription request
export interface TranscriptionConfig {
  tenantId: string;
  userId: string;
  audioFilePath: string;
  language?: TranscriptionLanguage;
}

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
 * Log AI usage for a transcription request
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
  // Estimate cost based on provider and tokens (rough estimates)
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
    taskType: 'transcription',
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
 * Read audio file and convert to base64
 */
async function readAudioFile(audioFilePath: string): Promise<{ base64: string; mimeType: string }> {
  // Handle relative paths from public directory
  let fullPath = audioFilePath;
  if (audioFilePath.startsWith('/uploads/')) {
    fullPath = path.join(process.cwd(), 'public', audioFilePath);
  }

  // Check if file exists
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Audio file not found: ${fullPath}`);
  }

  const fileBuffer = fs.readFileSync(fullPath);
  const base64 = fileBuffer.toString('base64');

  // Determine MIME type from extension
  const ext = path.extname(audioFilePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.webm': 'audio/webm',
    '.mp3': 'audio/mp3',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/m4a',
    '.mpeg': 'audio/mpeg',
  };
  const mimeType = mimeTypes[ext] || 'audio/webm';

  return { base64, mimeType };
}

/**
 * Transcribe audio using Anthropic Claude
 * Note: Claude doesn't have native audio transcription, so we use the vision capability
 * for audio file analysis. For production, consider using a dedicated speech-to-text service.
 */
async function transcribeWithAnthropic(
  apiKey: string,
  model: string,
  audioBase64: string,
  mimeType: string,
  language?: TranscriptionLanguage
): Promise<TranscriptionResult> {
  const startTime = Date.now();

  const languageInstruction = language
    ? `The audio is in ${language === 'de' ? 'German' : 'English'}. Transcribe it in the same language.`
    : 'Detect the language (German or English) and transcribe the audio in that language.';

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
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: audioBase64,
                },
              },
              {
                type: 'text',
                text: `You are a professional transcription assistant. ${languageInstruction}

Please transcribe the audio content accurately. Include:
- All spoken words
- Natural punctuation
- Paragraph breaks where appropriate

Output only the transcription text, without any additional commentary or labels.`,
              },
            ],
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

    const transcription = data.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    // Detect language from response if not specified
    const detectedLanguage = language || detectLanguage(transcription);

    return {
      success: true,
      transcription,
      language: detectedLanguage,
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
      totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during transcription',
      durationMs,
    };
  }
}

/**
 * Transcribe audio using Google Gemini
 */
async function transcribeWithGemini(
  apiKey: string,
  model: string,
  audioBase64: string,
  mimeType: string,
  language?: TranscriptionLanguage
): Promise<TranscriptionResult> {
  const startTime = Date.now();

  const languageInstruction = language
    ? `The audio is in ${language === 'de' ? 'German' : 'English'}. Transcribe it in the same language.`
    : 'Detect the language (German or English) and transcribe the audio in that language.';

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
                  inline_data: {
                    mime_type: mimeType,
                    data: audioBase64,
                  },
                },
                {
                  text: `You are a professional transcription assistant. ${languageInstruction}

Please transcribe the audio content accurately. Include:
- All spoken words
- Natural punctuation
- Paragraph breaks where appropriate

Output only the transcription text, without any additional commentary or labels.`,
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
      usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number; totalTokenCount: number };
    };

    const transcription =
      data.candidates?.[0]?.content?.parts
        ?.filter((part) => part.text)
        .map((part) => part.text)
        .join('\n')
        .trim() || '';

    // Detect language from response if not specified
    const detectedLanguage = language || detectLanguage(transcription);

    return {
      success: true,
      transcription,
      language: detectedLanguage,
      inputTokens: data.usageMetadata?.promptTokenCount || 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: data.usageMetadata?.totalTokenCount || 0,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during transcription',
      durationMs,
    };
  }
}

/**
 * Simple language detection based on common German words and patterns
 */
function detectLanguage(text: string): TranscriptionLanguage {
  // Common German words and patterns
  const germanPatterns = [
    /\b(und|oder|aber|nicht|ich|du|er|sie|es|wir|ihr|sein|haben|werden|können|müssen|sollen|wollen|machen|gehen|kommen|sehen|nehmen|geben|finden|stehen|lassen|fragen|sagen|zeigen|führen|bringen|denken|glauben|wissen|heißen|wohnen|arbeiten|spielen|lernen|lesen|schreiben|sprechen|hören|verstehen|meinen|lieben|brauchen|kaufen|verkaufen|essen|trinken|schlafen|leben|sterben|beginnen|vergessen|erinnern|helfen|tragen|fahren|fliegen|schwimmen|laufen|rennen|springen|tanzen|singen|kochen|backen|waschen|putzen|aufräumen|einkaufen|besuchen|anrufen|schicken|empfangen|öffnen|schließen|drücken|ziehen|schieben|heben|fallen|warten|suchen|finden|verlieren|gewinnen|verlieren|versuchen|schaffen|erreichen|entwickeln|verbessern|ändern|wechseln|entscheiden|bestellen|bezahlen|mieten|teilen|sammeln|sparen|ausgeben|investieren|produzieren|liefern|verkaufen|kaufen|bestellen|abholen|verpacken|versenden|reklamieren|umtauschen|reparieren|installieren|programmieren|designen|planen|organisieren|koordinieren|leiten|kontrollieren|überprüfen|testen|optimieren|dokumentieren|präsentieren|diskutieren|verhandeln|beraten|schulen|unterstützen|assistieren|delegieren|motivieren|kritisieren|loben|belohnen|bestrafen|ermutigen|warnen|informieren|kommunizieren|zuhören|beantworten|erklären|beschreiben|definieren|analysieren|bewerten|vergleichen|klassifizieren|identifizieren|unterscheiden|zusammenfassen|interpretieren|übersetzen|dolmetschen)\b/gi,
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

  // Normalize by text length
  const normalizedScore = germanScore / (text.split(/\s+/).length || 1);

  // If German score is above threshold, consider it German
  return normalizedScore > 0.15 ? 'de' : 'en';
}

/**
 * Main transcription function - uses tenant's AI configuration
 */
export async function transcribeAudio(config: TranscriptionConfig): Promise<TranscriptionResult> {
  const { tenantId, userId, audioFilePath, language } = config;

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
  const transcriptionConfig = (aiConfig.modelConfig as Record<string, { provider: 'anthropic' | 'gemini'; model: string } | undefined>)?.transcription;
  const provider = transcriptionConfig?.provider || aiConfig.defaultProvider;
  const model =
    transcriptionConfig?.model ||
    (provider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gemini-1.5-flash');

  // Get the API key for the selected provider
  const apiKey = provider === 'anthropic' ? aiConfig.anthropicApiKey : aiConfig.geminiApiKey;

  if (!apiKey) {
    return {
      success: false,
      error: `No API key configured for ${provider}`,
    };
  }

  // Read and encode the audio file
  let audioData: { base64: string; mimeType: string };
  try {
    audioData = await readAudioFile(audioFilePath);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to read audio file',
    };
  }

  // Perform transcription based on provider
  let result: TranscriptionResult;
  if (provider === 'anthropic') {
    result = await transcribeWithAnthropic(apiKey, model, audioData.base64, audioData.mimeType, language);
  } else {
    result = await transcribeWithGemini(apiKey, model, audioData.base64, audioData.mimeType, language);
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

  return result;
}

/**
 * Transcribe a diary entry's voice recording
 */
export async function transcribeDiaryEntry(
  diaryEntryId: string,
  tenantId: string,
  userId: string,
  language?: TranscriptionLanguage
): Promise<TranscriptionResult> {
  // Get the diary entry
  const [entry] = await db
    .select({
      id: diaryEntries.id,
      voiceRecordingUrl: diaryEntries.voiceRecordingUrl,
      transcriptionStatus: diaryEntries.transcriptionStatus,
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

  if (!entry.voiceRecordingUrl) {
    return {
      success: false,
      error: 'No voice recording found for this entry',
    };
  }

  // Mark as processing
  await db
    .update(diaryEntries)
    .set({
      transcriptionStatus: 'processing',
      transcriptionError: null,
      updatedAt: new Date(),
    })
    .where(eq(diaryEntries.id, diaryEntryId));

  // Perform transcription
  const result = await transcribeAudio({
    tenantId,
    userId,
    audioFilePath: entry.voiceRecordingUrl,
    language,
  });

  // Update the diary entry with results
  if (result.success && result.transcription) {
    await db
      .update(diaryEntries)
      .set({
        voiceTranscription: result.transcription,
        transcriptionStatus: 'completed',
        transcriptionLanguage: result.language || null,
        transcriptionError: null,
        updatedAt: new Date(),
      })
      .where(eq(diaryEntries.id, diaryEntryId));
  } else {
    await db
      .update(diaryEntries)
      .set({
        transcriptionStatus: 'failed',
        transcriptionError: result.error || 'Unknown error',
        updatedAt: new Date(),
      })
      .where(eq(diaryEntries.id, diaryEntryId));
  }

  return result;
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
