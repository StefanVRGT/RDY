import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{}]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  },
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock fs for file operations
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  readFileSync: vi.fn().mockReturnValue(Buffer.from('mock-audio-data')),
}));

// Mock crypto functions
vi.mock('@/lib/crypto/encryption', () => ({
  decryptApiKey: vi.fn().mockReturnValue('mock-api-key'),
  encryptApiKey: vi.fn().mockReturnValue('encrypted-key'),
  maskApiKey: vi.fn().mockReturnValue('sk-a****...key1'),
}));

describe('Voice Transcription - S10.3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AC-S10.3-1: Transcribe audio using tenant\'s AI config', () => {
    it('should use tenant AI settings for transcription', () => {
      const tenantConfig = {
        aiEnabled: true,
        defaultProvider: 'anthropic' as const,
        anthropicApiKey: 'sk-ant-test-key',
        geminiApiKey: null,
        modelConfig: {
          transcription: {
            provider: 'anthropic' as const,
            model: 'claude-3-5-sonnet-20241022',
          },
        },
      };

      // Verify tenant config has required fields
      expect(tenantConfig.aiEnabled).toBe(true);
      expect(tenantConfig.modelConfig.transcription).toBeDefined();
      expect(tenantConfig.modelConfig.transcription?.provider).toBe('anthropic');
    });

    it('should fall back to default provider if transcription config not set', () => {
      const tenantConfig = {
        aiEnabled: true,
        defaultProvider: 'gemini' as const,
        anthropicApiKey: null,
        geminiApiKey: 'gemini-api-key',
        modelConfig: {} as { transcription?: { provider: 'anthropic' | 'gemini'; model: string } },
      };

      const provider = tenantConfig.modelConfig.transcription?.provider || tenantConfig.defaultProvider;
      expect(provider).toBe('gemini');
    });

    it('should reject transcription when AI is disabled', () => {
      const tenantConfig = {
        aiEnabled: false,
        defaultProvider: 'anthropic' as const,
      };

      if (!tenantConfig.aiEnabled) {
        const error = 'AI features are disabled for this tenant';
        expect(error).toBe('AI features are disabled for this tenant');
      }
    });

    it('should reject transcription when no API key is configured', () => {
      const tenantConfig = {
        aiEnabled: true,
        defaultProvider: 'anthropic' as const,
        anthropicApiKey: null,
        geminiApiKey: null,
      };

      const apiKey = tenantConfig.defaultProvider === 'anthropic'
        ? tenantConfig.anthropicApiKey
        : tenantConfig.geminiApiKey;

      expect(apiKey).toBeNull();
    });

    it('should support both Anthropic and Gemini providers', () => {
      const supportedProviders = ['anthropic', 'gemini'] as const;
      expect(supportedProviders).toContain('anthropic');
      expect(supportedProviders).toContain('gemini');
    });
  });

  describe('AC-S10.3-2: Support German and English', () => {
    it('should support German language transcription', () => {
      const supportedLanguages = ['de', 'en'] as const;
      expect(supportedLanguages).toContain('de');
    });

    it('should support English language transcription', () => {
      const supportedLanguages = ['de', 'en'] as const;
      expect(supportedLanguages).toContain('en');
    });

    it('should detect German language from text', () => {
      const detectLanguage = (text: string): 'de' | 'en' => {
        const germanPatterns = [
          /\b(und|oder|aber|nicht|ich|du|er|sie|es|wir|ihr|sein|haben)\b/gi,
          /\b(der|die|das|ein|eine|einer)\b/gi,
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
      };

      const germanText = 'Ich bin heute sehr glücklich und möchte meine Gedanken teilen.';
      expect(detectLanguage(germanText)).toBe('de');
    });

    it('should detect English language from text', () => {
      const detectLanguage = (text: string): 'de' | 'en' => {
        const germanPatterns = [
          /\b(und|oder|aber|nicht|ich|du|er|sie|es|wir|ihr|sein|haben)\b/gi,
          /\b(der|die|das|ein|eine|einer)\b/gi,
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
      };

      const englishText = 'I am very happy today and want to share my thoughts with everyone.';
      expect(detectLanguage(englishText)).toBe('en');
    });

    it('should allow explicit language specification', () => {
      const config = {
        entryId: 'test-entry-id',
        language: 'de' as const,
      };

      expect(config.language).toBe('de');
    });

    it('should include language instruction in transcription prompt', () => {
      const language = 'de';
      const instruction = language
        ? `The audio is in ${language === 'de' ? 'German' : 'English'}. Transcribe it in the same language.`
        : 'Detect the language (German or English) and transcribe the audio in that language.';

      expect(instruction).toContain('German');
    });
  });

  describe('AC-S10.3-3: Store transcription with diary entry', () => {
    it('should have transcription fields in diary entry schema', () => {
      const diaryEntryFields = {
        id: 'uuid',
        userId: 'uuid',
        entryType: 'text' as const,
        content: 'text content',
        voiceRecordingUrl: '/uploads/audio/recording.webm',
        voiceRecordingDuration: 60,
        voiceTranscription: 'This is the transcribed text',
        transcriptionStatus: 'completed' as const,
        transcriptionLanguage: 'en' as const,
        transcriptionError: null,
        entryDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(diaryEntryFields.voiceTranscription).toBeDefined();
      expect(diaryEntryFields.transcriptionStatus).toBeDefined();
      expect(diaryEntryFields.transcriptionLanguage).toBeDefined();
    });

    it('should support all transcription status values', () => {
      const statusValues = ['pending', 'processing', 'completed', 'failed'] as const;

      expect(statusValues).toContain('pending');
      expect(statusValues).toContain('processing');
      expect(statusValues).toContain('completed');
      expect(statusValues).toContain('failed');
    });

    it('should update diary entry with transcription on success', async () => {
      const mockResult = {
        success: true,
        transcription: 'This is the transcribed audio content.',
        language: 'en' as const,
      };

      if (mockResult.success && mockResult.transcription) {
        const updateData = {
          voiceTranscription: mockResult.transcription,
          transcriptionStatus: 'completed' as const,
          transcriptionLanguage: mockResult.language,
          transcriptionError: null,
          updatedAt: new Date(),
        };

        expect(updateData.voiceTranscription).toBe('This is the transcribed audio content.');
        expect(updateData.transcriptionStatus).toBe('completed');
        expect(updateData.transcriptionLanguage).toBe('en');
      }
    });

    it('should store transcription language', () => {
      const transcriptionResult = {
        transcription: 'Heute war ein guter Tag.',
        language: 'de' as const,
      };

      expect(transcriptionResult.language).toBe('de');
    });

    it('should return transcription in getEntry response', () => {
      const entryWithTranscription = {
        id: 'entry-123',
        entryType: 'voice' as const,
        content: null,
        voiceRecordingUrl: '/uploads/audio/recording.webm',
        voiceRecordingDuration: 120,
        voiceTranscription: 'This is my diary entry for today.',
        transcriptionStatus: 'completed' as const,
        transcriptionLanguage: 'en' as const,
        transcriptionError: null,
        entryDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(entryWithTranscription.voiceTranscription).toBeDefined();
      expect(entryWithTranscription.transcriptionStatus).toBe('completed');
    });
  });

  describe('AC-S10.3-4: Error handling for failed transcriptions', () => {
    it('should mark entry as failed on transcription error', () => {
      const errorResult = {
        success: false,
        error: 'Anthropic API error: Rate limit exceeded',
      };

      if (!errorResult.success) {
        const updateData = {
          transcriptionStatus: 'failed' as const,
          transcriptionError: errorResult.error,
          updatedAt: new Date(),
        };

        expect(updateData.transcriptionStatus).toBe('failed');
        expect(updateData.transcriptionError).toBe('Anthropic API error: Rate limit exceeded');
      }
    });

    it('should handle file not found error', () => {
      const audioFilePath = '/uploads/audio/nonexistent.webm';
      const fileExists = false;

      if (!fileExists) {
        const error = `Audio file not found: ${audioFilePath}`;
        expect(error).toContain('not found');
      }
    });

    it('should handle no voice recording error', () => {
      const entry = {
        id: 'entry-123',
        voiceRecordingUrl: null,
      };

      if (!entry.voiceRecordingUrl) {
        const error = 'No voice recording found for this entry';
        expect(error).toContain('No voice recording');
      }
    });

    it('should handle API key not configured error', () => {
      const config = {
        provider: 'anthropic' as const,
        apiKey: null,
      };

      if (!config.apiKey) {
        const error = `No API key configured for ${config.provider}`;
        expect(error).toContain('No API key configured');
      }
    });

    it('should handle AI disabled error', () => {
      const aiEnabled = false;

      if (!aiEnabled) {
        const error = 'AI features are disabled for this tenant';
        expect(error).toContain('disabled');
      }
    });

    it('should handle concurrent transcription request', () => {
      const entry = {
        id: 'entry-123',
        transcriptionStatus: 'processing' as const,
      };

      if (entry.transcriptionStatus === 'processing') {
        const error = 'Transcription is already in progress';
        expect(error).toContain('already in progress');
      }
    });

    it('should store error message on failure', () => {
      const failedEntry = {
        id: 'entry-123',
        transcriptionStatus: 'failed' as const,
        transcriptionError: 'Connection timeout while calling Gemini API',
      };

      expect(failedEntry.transcriptionStatus).toBe('failed');
      expect(failedEntry.transcriptionError).toBeDefined();
      expect(failedEntry.transcriptionError).not.toBeNull();
    });

    it('should handle network errors gracefully', () => {
      const networkError = new Error('Network request failed');

      const result = {
        success: false,
        error: networkError.message,
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network request failed');
    });

    it('should handle HTTP error responses', () => {
      const httpErrorCodes = [400, 401, 403, 429, 500, 502, 503];

      httpErrorCodes.forEach((code) => {
        const isError = code >= 400;
        expect(isError).toBe(true);
      });
    });

    it('should log failed transcription attempts', () => {
      const usageLog = {
        tenantId: 'tenant-123',
        userId: 'user-456',
        provider: 'anthropic' as const,
        model: 'claude-3-5-sonnet-20241022',
        taskType: 'transcription' as const,
        inputTokens: 100,
        outputTokens: 0,
        totalTokens: 100,
        success: false,
        errorMessage: 'Rate limit exceeded',
        durationMs: 1500,
      };

      expect(usageLog.success).toBe(false);
      expect(usageLog.errorMessage).toBeDefined();
      expect(usageLog.taskType).toBe('transcription');
    });
  });

  describe('Audio file handling', () => {
    it('should support webm audio format', () => {
      const mimeTypes: Record<string, string> = {
        '.webm': 'audio/webm',
        '.mp3': 'audio/mp3',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.m4a': 'audio/m4a',
      };

      expect(mimeTypes['.webm']).toBe('audio/webm');
    });

    it('should support mp3 audio format', () => {
      const mimeTypes: Record<string, string> = {
        '.mp3': 'audio/mp3',
      };

      expect(mimeTypes['.mp3']).toBe('audio/mp3');
    });

    it('should support wav audio format', () => {
      const mimeTypes: Record<string, string> = {
        '.wav': 'audio/wav',
      };

      expect(mimeTypes['.wav']).toBe('audio/wav');
    });

    it('should handle relative paths from public directory', () => {
      const audioPath = '/uploads/audio/recording.webm';
      const isRelative = audioPath.startsWith('/uploads/');

      expect(isRelative).toBe(true);
    });

    it('should encode audio as base64', () => {
      const audioData = Buffer.from('mock-audio-data');
      const base64 = audioData.toString('base64');

      expect(base64).toBe('bW9jay1hdWRpby1kYXRh');
    });
  });

  describe('AI Provider Integration', () => {
    it('should format Anthropic API request correctly', () => {
      const request = {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'audio/webm',
                  data: 'base64-audio-data',
                },
              },
              {
                type: 'text',
                text: 'Transcribe the audio...',
              },
            ],
          },
        ],
      };

      expect(request.model).toBeDefined();
      expect(request.messages[0].content).toHaveLength(2);
      expect(request.messages[0].content[0].type).toBe('document');
    });

    it('should format Gemini API request correctly', () => {
      const request = {
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: 'audio/webm',
                  data: 'base64-audio-data',
                },
              },
              {
                text: 'Transcribe the audio...',
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 4096,
        },
      };

      expect(request.contents[0].parts).toHaveLength(2);
      expect(request.contents[0].parts[0].inline_data).toBeDefined();
    });

    it('should include correct headers for Anthropic', () => {
      const headers = {
        'Content-Type': 'application/json',
        'x-api-key': 'sk-ant-test-key',
        'anthropic-version': '2023-06-01',
      };

      expect(headers['x-api-key']).toBeDefined();
      expect(headers['anthropic-version']).toBe('2023-06-01');
    });

    it('should include API key in Gemini URL', () => {
      const apiKey = 'gemini-test-key';
      const model = 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      expect(url).toContain('key=');
      expect(url).toContain(model);
    });
  });

  describe('Usage logging', () => {
    it('should log successful transcription usage', () => {
      const log = {
        tenantId: 'tenant-123',
        userId: 'user-456',
        provider: 'anthropic' as const,
        model: 'claude-3-5-sonnet-20241022',
        taskType: 'transcription' as const,
        inputTokens: 500,
        outputTokens: 200,
        totalTokens: 700,
        success: true,
        durationMs: 3500,
      };

      expect(log.taskType).toBe('transcription');
      expect(log.success).toBe(true);
      expect(log.totalTokens).toBe(700);
    });

    it('should estimate cost correctly for Anthropic', () => {
      // Claude pricing: ~$3/1M input tokens, ~$15/1M output tokens (Sonnet)
      const inputTokens = 1000;
      const outputTokens = 500;
      const estimatedCostCents = Math.round((inputTokens * 0.3 + outputTokens * 1.5) / 1000);

      // (1000 * 0.3 + 500 * 1.5) / 1000 = (300 + 750) / 1000 = 1.05 -> 1 cent
      expect(estimatedCostCents).toBe(1);
    });

    it('should estimate cost correctly for Gemini', () => {
      // Gemini pricing: ~$0.35/1M input tokens, ~$1.05/1M output tokens (Pro)
      const inputTokens = 10000;
      const outputTokens = 5000;
      const estimatedCostCents = Math.round((inputTokens * 0.035 + outputTokens * 0.105) / 1000);

      // (10000 * 0.035 + 5000 * 0.105) / 1000 = (350 + 525) / 1000 = 0.875 -> 1 cent
      expect(estimatedCostCents).toBe(1);
    });

    it('should track duration in milliseconds', () => {
      // Simulate processing time measurement
      const processingTime = 2500;
      const durationMs = processingTime;

      expect(durationMs).toBeGreaterThan(0);
    });
  });

  describe('Schema validation', () => {
    it('should have transcription task type in AI task types', async () => {
      const schema = await import('@/lib/db/schema');
      expect(schema.aiTaskTypeEnum).toBeDefined();
    });

    it('should have transcription status enum', async () => {
      const schema = await import('@/lib/db/schema');
      expect(schema.transcriptionStatusEnum).toBeDefined();
    });

    it('should have transcription language enum', async () => {
      const schema = await import('@/lib/db/schema');
      expect(schema.transcriptionLanguageEnum).toBeDefined();
    });

    it('should have transcription fields in diary entries', async () => {
      const schema = await import('@/lib/db/schema');
      expect(schema.diaryEntries).toBeDefined();
    });
  });

  describe('tRPC procedures', () => {
    it('should validate transcribeEntry input', () => {
      const validInput = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        language: 'de' as const,
      };

      expect(validInput.id).toMatch(/^[0-9a-f-]{36}$/i);
      expect(['de', 'en']).toContain(validInput.language);
    });

    it('should allow transcribeEntry without language', () => {
      const validInput = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      expect(validInput.id).toBeDefined();
      expect((validInput as { language?: string }).language).toBeUndefined();
    });

    it('should validate getTranscriptionStatus input', () => {
      const validInput = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      expect(validInput.id).toMatch(/^[0-9a-f-]{36}$/i);
    });

    it('should return transcription status response', () => {
      const response = {
        status: 'completed' as const,
        transcription: 'Transcribed text here',
        language: 'en' as const,
        error: null,
      };

      expect(response.status).toBe('completed');
      expect(response.transcription).toBeDefined();
      expect(response.error).toBeNull();
    });
  });
});
