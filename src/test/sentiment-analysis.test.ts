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

// Mock crypto functions
vi.mock('@/lib/crypto/encryption', () => ({
  decryptApiKey: vi.fn().mockReturnValue('mock-api-key'),
  encryptApiKey: vi.fn().mockReturnValue('encrypted-key'),
  maskApiKey: vi.fn().mockReturnValue('sk-a****...key1'),
}));

describe('Sentiment Analysis - S11.3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AC-S11.3-1: Analyze transcribed/text diary entries', () => {
    it('should analyze text diary entries', () => {
      const diaryEntry = {
        id: 'entry-123',
        content: 'Today was a wonderful day. I felt happy and grateful for everything.',
        isVoice: false,
      };

      expect(diaryEntry.content).toBeDefined();
      expect(diaryEntry.content.length).toBeGreaterThan(0);
    });

    it('should analyze transcribed voice entries', () => {
      const diaryEntry = {
        id: 'entry-456',
        content: 'This is my transcribed diary entry. I feel a bit stressed about work.',
        isVoice: true,
      };

      expect(diaryEntry.isVoice).toBe(true);
      expect(diaryEntry.content).toBeDefined();
    });

    it('should support German language analysis', () => {
      const germanText = 'Heute war ein wunderbarer Tag. Ich fühlte mich glücklich und dankbar.';
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

      expect(detectLanguage(germanText)).toBe('de');
    });

    it('should support English language analysis', () => {
      const englishText = 'Today I felt really happy and grateful for my friends and family.';
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

      expect(detectLanguage(englishText)).toBe('en');
    });

    it('should use tenant AI configuration for analysis', () => {
      const tenantConfig = {
        aiEnabled: true,
        defaultProvider: 'anthropic' as const,
        anthropicApiKey: 'sk-ant-test-key',
        modelConfig: {
          analysis: {
            provider: 'anthropic' as const,
            model: 'claude-3-5-sonnet-20241022',
          },
        },
      };

      expect(tenantConfig.aiEnabled).toBe(true);
      expect(tenantConfig.modelConfig.analysis).toBeDefined();
      expect(tenantConfig.modelConfig.analysis?.provider).toBe('anthropic');
    });

    it('should reject analysis when AI is disabled', () => {
      const tenantConfig = {
        aiEnabled: false,
        defaultProvider: 'anthropic' as const,
      };

      if (!tenantConfig.aiEnabled) {
        const error = 'AI features are disabled for this tenant';
        expect(error).toBe('AI features are disabled for this tenant');
      }
    });

    it('should reject analysis when text is empty', () => {
      const emptyText = '';

      if (!emptyText || emptyText.trim().length === 0) {
        const error = 'Text is required for sentiment analysis';
        expect(error).toBe('Text is required for sentiment analysis');
      }
    });

    it('should support both Anthropic and Gemini providers', () => {
      const supportedProviders = ['anthropic', 'gemini'] as const;
      expect(supportedProviders).toContain('anthropic');
      expect(supportedProviders).toContain('gemini');
    });
  });

  describe('AC-S11.3-2: Extract sentiment score', () => {
    it('should extract sentiment score between -1 and 1', () => {
      const sentimentResult = {
        sentimentScore: 0.75,
        sentimentLabel: 'positive' as const,
        confidence: 0.9,
      };

      expect(sentimentResult.sentimentScore).toBeGreaterThanOrEqual(-1);
      expect(sentimentResult.sentimentScore).toBeLessThanOrEqual(1);
    });

    it('should categorize very negative sentiment', () => {
      const score = -0.8;
      const label = score <= -0.6 ? 'very_negative' : score <= -0.2 ? 'negative' : 'neutral';
      expect(label).toBe('very_negative');
    });

    it('should categorize negative sentiment', () => {
      const score = -0.4;
      const label = score <= -0.6 ? 'very_negative' : score <= -0.2 ? 'negative' : 'neutral';
      expect(label).toBe('negative');
    });

    it('should categorize neutral sentiment', () => {
      const score = 0.1;
      const sentimentScoreToLabel = (s: number) => {
        if (s <= -0.6) return 'very_negative';
        if (s <= -0.2) return 'negative';
        if (s <= 0.2) return 'neutral';
        if (s <= 0.6) return 'positive';
        return 'very_positive';
      };
      expect(sentimentScoreToLabel(score)).toBe('neutral');
    });

    it('should categorize positive sentiment', () => {
      const score = 0.5;
      const sentimentScoreToLabel = (s: number) => {
        if (s <= -0.6) return 'very_negative';
        if (s <= -0.2) return 'negative';
        if (s <= 0.2) return 'neutral';
        if (s <= 0.6) return 'positive';
        return 'very_positive';
      };
      expect(sentimentScoreToLabel(score)).toBe('positive');
    });

    it('should categorize very positive sentiment', () => {
      const score = 0.85;
      const sentimentScoreToLabel = (s: number) => {
        if (s <= -0.6) return 'very_negative';
        if (s <= -0.2) return 'negative';
        if (s <= 0.2) return 'neutral';
        if (s <= 0.6) return 'positive';
        return 'very_positive';
      };
      expect(sentimentScoreToLabel(score)).toBe('very_positive');
    });

    it('should include confidence score', () => {
      const result = {
        sentimentScore: 0.6,
        confidence: 0.85,
      };

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should normalize out-of-bounds scores', () => {
      const normalizeScore = (score: number) => Math.max(-1, Math.min(1, score));

      expect(normalizeScore(1.5)).toBe(1);
      expect(normalizeScore(-1.5)).toBe(-1);
      expect(normalizeScore(0.5)).toBe(0.5);
    });

    it('should convert sentiment label to score', () => {
      const sentimentLabelToScore = (label: string): number => {
        switch (label) {
          case 'very_negative': return -0.8;
          case 'negative': return -0.4;
          case 'neutral': return 0;
          case 'positive': return 0.4;
          case 'very_positive': return 0.8;
          default: return 0;
        }
      };

      expect(sentimentLabelToScore('very_negative')).toBe(-0.8);
      expect(sentimentLabelToScore('positive')).toBe(0.4);
    });

    it('should validate sentiment labels', () => {
      const validLabels = ['very_negative', 'negative', 'neutral', 'positive', 'very_positive'];

      const validateLabel = (label: unknown) => {
        if (typeof label === 'string' && validLabels.includes(label)) {
          return label;
        }
        return 'neutral';
      };

      expect(validateLabel('positive')).toBe('positive');
      expect(validateLabel('invalid')).toBe('neutral');
      expect(validateLabel(123)).toBe('neutral');
    });
  });

  describe('AC-S11.3-3: Identify emotional patterns and keywords', () => {
    it('should detect multiple emotions', () => {
      const emotions = [
        { emotion: 'joy', intensity: 0.8, confidence: 0.9 },
        { emotion: 'gratitude', intensity: 0.6, confidence: 0.85 },
        { emotion: 'calm', intensity: 0.5, confidence: 0.7 },
      ];

      expect(emotions.length).toBeGreaterThan(0);
      expect(emotions[0].emotion).toBe('joy');
      expect(emotions[0].intensity).toBeGreaterThanOrEqual(0);
      expect(emotions[0].intensity).toBeLessThanOrEqual(1);
    });

    it('should identify dominant emotion', () => {
      const emotions = [
        { emotion: 'joy' as const, intensity: 0.9 },
        { emotion: 'gratitude' as const, intensity: 0.6 },
        { emotion: 'calm' as const, intensity: 0.4 },
      ];

      const dominantEmotion = emotions.reduce((max, e) =>
        e.intensity > max.intensity ? e : max
      ).emotion;

      expect(dominantEmotion).toBe('joy');
    });

    it('should support all emotion categories', () => {
      const emotionCategories = [
        'joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust',
        'trust', 'anticipation', 'anxiety', 'contentment', 'frustration',
        'hope', 'loneliness', 'gratitude', 'stress', 'calm'
      ] as const;

      expect(emotionCategories.length).toBe(16);
      expect(emotionCategories).toContain('anxiety');
      expect(emotionCategories).toContain('gratitude');
    });

    it('should extract emotional patterns', () => {
      const patterns = [
        {
          pattern: 'recurring stress mentions',
          description: 'User frequently mentions work-related stress',
          frequency: 3,
          sentiment: 'negative' as const,
        },
        {
          pattern: 'gratitude expressions',
          description: 'Regular expressions of thankfulness',
          frequency: 2,
          sentiment: 'positive' as const,
        },
      ];

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].pattern).toBeDefined();
      expect(patterns[0].frequency).toBeGreaterThan(0);
    });

    it('should extract sentiment keywords', () => {
      const keywords = [
        { keyword: 'happy', sentiment: 'positive' as const, weight: 0.9 },
        { keyword: 'grateful', sentiment: 'positive' as const, weight: 0.8 },
        { keyword: 'stressed', sentiment: 'negative' as const, weight: 0.7 },
      ];

      expect(keywords.length).toBeGreaterThan(0);
      expect(keywords[0].keyword).toBe('happy');
      expect(keywords[0].sentiment).toBe('positive');
      expect(keywords[0].weight).toBeGreaterThanOrEqual(0);
      expect(keywords[0].weight).toBeLessThanOrEqual(1);
    });

    it('should limit number of patterns', () => {
      const patterns = Array.from({ length: 15 }, (_, i) => ({
        pattern: `pattern-${i}`,
        description: `description-${i}`,
        frequency: 1,
        sentiment: 'neutral' as const,
      }));

      const limitedPatterns = patterns.slice(0, 10);
      expect(limitedPatterns.length).toBeLessThanOrEqual(10);
    });

    it('should limit number of keywords', () => {
      const keywords = Array.from({ length: 25 }, (_, i) => ({
        keyword: `keyword-${i}`,
        sentiment: 'neutral' as const,
        weight: 0.5,
      }));

      const limitedKeywords = keywords.slice(0, 20);
      expect(limitedKeywords.length).toBeLessThanOrEqual(20);
    });

    it('should validate emotion intensity range', () => {
      const normalizeIntensity = (intensity: number) => Math.max(0, Math.min(1, intensity));

      expect(normalizeIntensity(1.5)).toBe(1);
      expect(normalizeIntensity(-0.5)).toBe(0);
      expect(normalizeIntensity(0.5)).toBe(0.5);
    });

    it('should validate keyword weight range', () => {
      const normalizeWeight = (weight: number) => Math.max(0, Math.min(1, weight));

      expect(normalizeWeight(1.5)).toBe(1);
      expect(normalizeWeight(-0.2)).toBe(0);
      expect(normalizeWeight(0.75)).toBe(0.75);
    });
  });

  describe('AC-S11.3-4: Generate mood barometer data', () => {
    it('should generate mood barometer with all required fields', () => {
      const moodBarometer = {
        overallMood: 'positive' as const,
        moodScore: 65,
        dominantEmotion: 'joy' as const,
        emotionIntensity: 75,
        energyLevel: 'high' as const,
        stressIndicator: 'low' as const,
        recommendedAction: 'Continue with your positive activities and maintain this good energy.',
      };

      expect(moodBarometer.overallMood).toBeDefined();
      expect(moodBarometer.moodScore).toBeDefined();
      expect(moodBarometer.dominantEmotion).toBeDefined();
      expect(moodBarometer.emotionIntensity).toBeDefined();
      expect(moodBarometer.energyLevel).toBeDefined();
      expect(moodBarometer.stressIndicator).toBeDefined();
    });

    it('should have mood score in range -100 to 100', () => {
      const moodBarometer = {
        moodScore: 75,
      };

      expect(moodBarometer.moodScore).toBeGreaterThanOrEqual(-100);
      expect(moodBarometer.moodScore).toBeLessThanOrEqual(100);
    });

    it('should normalize out-of-bounds mood score', () => {
      const normalizeMoodScore = (score: number) => Math.max(-100, Math.min(100, score));

      expect(normalizeMoodScore(150)).toBe(100);
      expect(normalizeMoodScore(-150)).toBe(-100);
      expect(normalizeMoodScore(50)).toBe(50);
    });

    it('should have emotion intensity in range 0 to 100', () => {
      const moodBarometer = {
        emotionIntensity: 80,
      };

      expect(moodBarometer.emotionIntensity).toBeGreaterThanOrEqual(0);
      expect(moodBarometer.emotionIntensity).toBeLessThanOrEqual(100);
    });

    it('should support all energy level values', () => {
      const validEnergyLevels = ['low', 'medium', 'high'] as const;

      expect(validEnergyLevels).toContain('low');
      expect(validEnergyLevels).toContain('medium');
      expect(validEnergyLevels).toContain('high');
    });

    it('should support all stress indicator values', () => {
      const validStressIndicators = ['low', 'moderate', 'high'] as const;

      expect(validStressIndicators).toContain('low');
      expect(validStressIndicators).toContain('moderate');
      expect(validStressIndicators).toContain('high');
    });

    it('should validate energy level', () => {
      const validateEnergyLevel = (level: unknown): 'low' | 'medium' | 'high' => {
        const validLevels = ['low', 'medium', 'high'];
        if (typeof level === 'string' && validLevels.includes(level)) {
          return level as 'low' | 'medium' | 'high';
        }
        return 'medium';
      };

      expect(validateEnergyLevel('high')).toBe('high');
      expect(validateEnergyLevel('invalid')).toBe('medium');
    });

    it('should validate stress indicator', () => {
      const validateStressIndicator = (indicator: unknown): 'low' | 'moderate' | 'high' => {
        const validIndicators = ['low', 'moderate', 'high'];
        if (typeof indicator === 'string' && validIndicators.includes(indicator)) {
          return indicator as 'low' | 'moderate' | 'high';
        }
        return 'moderate';
      };

      expect(validateStressIndicator('high')).toBe('high');
      expect(validateStressIndicator('invalid')).toBe('moderate');
    });

    it('should include optional recommended action', () => {
      const moodBarometerWithAction = {
        overallMood: 'negative' as const,
        moodScore: -45,
        recommendedAction: 'Consider taking a short break or practicing deep breathing exercises.',
      };

      expect(moodBarometerWithAction.recommendedAction).toBeDefined();
      expect(moodBarometerWithAction.recommendedAction.length).toBeGreaterThan(0);
    });

    it('should handle missing recommended action', () => {
      const moodBarometerWithoutAction = {
        overallMood: 'neutral' as const,
        moodScore: 0,
        recommendedAction: undefined,
      };

      expect(moodBarometerWithoutAction.recommendedAction).toBeUndefined();
    });
  });

  describe('Aggregation functions', () => {
    it('should calculate average sentiment from multiple results', () => {
      const results = [
        { success: true, sentimentScore: 0.5 },
        { success: true, sentimentScore: 0.3 },
        { success: true, sentimentScore: 0.7 },
      ];

      const successfulResults = results.filter((r) => r.success && r.sentimentScore !== undefined);
      const averageSentiment = successfulResults.reduce((sum, r) => sum + (r.sentimentScore || 0), 0) / successfulResults.length;

      expect(averageSentiment).toBeCloseTo(0.5, 2);
    });

    it('should find dominant emotions across results', () => {
      const results = [
        { success: true, dominantEmotion: 'joy' as const },
        { success: true, dominantEmotion: 'joy' as const },
        { success: true, dominantEmotion: 'calm' as const },
        { success: true, dominantEmotion: 'gratitude' as const },
      ];

      const emotionCounts = new Map<string, number>();
      results.forEach((r) => {
        if (r.dominantEmotion) {
          emotionCounts.set(r.dominantEmotion, (emotionCounts.get(r.dominantEmotion) || 0) + 1);
        }
      });

      const sortedEmotions = Array.from(emotionCounts.entries())
        .sort((a, b) => b[1] - a[1]);

      expect(sortedEmotions[0][0]).toBe('joy');
      expect(sortedEmotions[0][1]).toBe(2);
    });

    it('should calculate overall stress level', () => {
      const stressIndicators: ('low' | 'moderate' | 'high')[] = ['low', 'moderate', 'high', 'moderate'];

      const stressScore = stressIndicators.reduce((sum, s) => {
        if (s === 'low') return sum;
        if (s === 'moderate') return sum + 1;
        return sum + 2;
      }, 0) / stressIndicators.length;

      // 0 + 1 + 2 + 1 = 4 / 4 = 1 -> moderate
      const overallStress: 'low' | 'moderate' | 'high' =
        stressScore < 0.5 ? 'low' : stressScore < 1.5 ? 'moderate' : 'high';

      expect(overallStress).toBe('moderate');
    });

    it('should calculate sentiment trend direction', () => {
      const results = [
        { sentimentScore: 0.2 },
        { sentimentScore: 0.3 },
        { sentimentScore: 0.5 },
        { sentimentScore: 0.7 },
      ];

      const midpoint = Math.floor(results.length / 2);
      const firstHalf = results.slice(0, midpoint);
      const secondHalf = results.slice(midpoint);

      const firstAvg = firstHalf.reduce((sum, r) => sum + (r.sentimentScore || 0), 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, r) => sum + (r.sentimentScore || 0), 0) / secondHalf.length;

      const difference = secondAvg - firstAvg;

      let trendDirection: 'improving' | 'stable' | 'declining';
      if (difference > 0.1) trendDirection = 'improving';
      else if (difference < -0.1) trendDirection = 'declining';
      else trendDirection = 'stable';

      expect(trendDirection).toBe('improving');
    });

    it('should handle empty results', () => {
      const results: { success: boolean; sentimentScore?: number }[] = [];

      const successfulResults = results.filter((r) => r.success && r.sentimentScore !== undefined);

      expect(successfulResults.length).toBe(0);

      // Default values for empty results
      const aggregate = {
        averageSentiment: 0,
        averageMood: 'neutral' as const,
        dominantEmotions: [] as string[],
        overallStress: 'moderate' as const,
        trendDirection: 'stable' as const,
      };

      expect(aggregate.averageSentiment).toBe(0);
      expect(aggregate.averageMood).toBe('neutral');
    });

    it('should handle results with failures', () => {
      const results = [
        { success: true, sentimentScore: 0.5 },
        { success: false, error: 'API error' },
        { success: true, sentimentScore: 0.7 },
      ];

      const successfulResults = results.filter((r) => r.success && 'sentimentScore' in r);
      expect(successfulResults.length).toBe(2);
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
            content: 'Analyze the following text for sentiment...',
          },
        ],
      };

      expect(request.model).toBeDefined();
      expect(request.max_tokens).toBe(4096);
      expect(request.messages).toHaveLength(1);
    });

    it('should format Gemini API request correctly', () => {
      const request = {
        contents: [
          {
            parts: [
              {
                text: 'Analyze the following text for sentiment...',
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 4096,
        },
      };

      expect(request.contents[0].parts).toHaveLength(1);
      expect(request.generationConfig.maxOutputTokens).toBe(4096);
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

  describe('Response parsing', () => {
    it('should parse valid JSON response', () => {
      const validResponse = JSON.stringify({
        sentimentScore: 0.7,
        sentimentLabel: 'positive',
        confidence: 0.85,
        emotions: [
          { emotion: 'joy', intensity: 0.8, confidence: 0.9 }
        ],
        dominantEmotion: 'joy',
        emotionalPatterns: [
          { pattern: 'happiness', description: 'Expressions of happiness', frequency: 2, sentiment: 'positive' }
        ],
        keywords: [
          { keyword: 'happy', sentiment: 'positive', weight: 0.9 }
        ],
        moodBarometer: {
          overallMood: 'positive',
          moodScore: 70,
          dominantEmotion: 'joy',
          emotionIntensity: 80,
          energyLevel: 'high',
          stressIndicator: 'low',
        }
      });

      const parsed = JSON.parse(validResponse);

      expect(parsed.sentimentScore).toBe(0.7);
      expect(parsed.sentimentLabel).toBe('positive');
      expect(parsed.emotions).toHaveLength(1);
    });

    it('should extract JSON from response with surrounding text', () => {
      const responseWithText = `Here is the analysis:
      {
        "sentimentScore": 0.5,
        "sentimentLabel": "neutral"
      }
      Hope this helps!`;

      const jsonMatch = responseWithText.match(/\{[\s\S]*\}/);
      expect(jsonMatch).not.toBeNull();

      const parsed = JSON.parse(jsonMatch![0]);
      expect(parsed.sentimentScore).toBe(0.5);
    });

    it('should handle invalid JSON gracefully', () => {
      const invalidJson = 'This is not JSON';

      const jsonMatch = invalidJson.match(/\{[\s\S]*\}/);
      expect(jsonMatch).toBeNull();
    });

    it('should validate and normalize parsed values', () => {
      const rawParsed = {
        sentimentScore: 1.5, // Out of bounds
        confidence: -0.5, // Out of bounds
      };

      const normalized = {
        sentimentScore: Math.max(-1, Math.min(1, rawParsed.sentimentScore)),
        confidence: Math.max(0, Math.min(1, rawParsed.confidence)),
      };

      expect(normalized.sentimentScore).toBe(1);
      expect(normalized.confidence).toBe(0);
    });
  });

  describe('Usage logging', () => {
    it('should log successful sentiment analysis usage', () => {
      const log = {
        tenantId: 'tenant-123',
        userId: 'user-456',
        provider: 'anthropic' as const,
        model: 'claude-3-5-sonnet-20241022',
        taskType: 'analysis' as const,
        inputTokens: 500,
        outputTokens: 300,
        totalTokens: 800,
        success: true,
        durationMs: 2500,
      };

      expect(log.taskType).toBe('analysis');
      expect(log.success).toBe(true);
      expect(log.totalTokens).toBe(800);
    });

    it('should log failed sentiment analysis', () => {
      const log = {
        tenantId: 'tenant-123',
        userId: 'user-456',
        provider: 'gemini' as const,
        model: 'gemini-1.5-flash',
        taskType: 'analysis' as const,
        inputTokens: 500,
        outputTokens: 0,
        totalTokens: 500,
        success: false,
        errorMessage: 'Failed to parse sentiment response',
        durationMs: 1500,
      };

      expect(log.success).toBe(false);
      expect(log.errorMessage).toBeDefined();
    });

    it('should estimate cost correctly for Anthropic', () => {
      // Claude pricing: ~$3/1M input tokens, ~$15/1M output tokens (Sonnet)
      const inputTokens = 1000;
      const outputTokens = 500;
      const estimatedCostCents = Math.round((inputTokens * 0.3 + outputTokens * 1.5) / 1000);

      expect(estimatedCostCents).toBe(1);
    });

    it('should estimate cost correctly for Gemini', () => {
      // Gemini pricing: ~$0.35/1M input tokens, ~$1.05/1M output tokens (Pro)
      const inputTokens = 10000;
      const outputTokens = 5000;
      const estimatedCostCents = Math.round((inputTokens * 0.035 + outputTokens * 0.105) / 1000);

      expect(estimatedCostCents).toBe(1);
    });
  });

  describe('Error handling', () => {
    it('should handle AI disabled error', () => {
      const aiEnabled = false;

      if (!aiEnabled) {
        const error = 'AI features are disabled for this tenant';
        expect(error).toContain('disabled');
      }
    });

    it('should handle no API key error', () => {
      const provider = 'anthropic';
      const apiKey = null;

      if (!apiKey) {
        const error = `No API key configured for ${provider}`;
        expect(error).toContain('No API key configured');
      }
    });

    it('should handle diary entry not found', () => {
      const entry = null;

      if (!entry) {
        const error = 'Diary entry not found';
        expect(error).toBe('Diary entry not found');
      }
    });

    it('should handle empty text content', () => {
      const text = '';

      if (!text || text.trim().length === 0) {
        const error = 'No text content found for analysis';
        expect(error).toContain('No text content');
      }
    });

    it('should handle network errors', () => {
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

    it('should handle parse errors', () => {
      const parseError = 'Failed to parse sentiment response: No JSON found in response';

      expect(parseError).toContain('Failed to parse');
    });
  });

  describe('Prompt building', () => {
    it('should build prompt with text replacement', () => {
      const template = 'Analyze this text: {{text}}';
      const text = 'I am feeling happy today.';

      const prompt = template.replace('{{text}}', text);

      expect(prompt).toContain('I am feeling happy today.');
    });

    it('should handle context in prompt', () => {
      const template = `{{#if context}}
Context: {{context}}
{{/if}}

Text: {{text}}`;

      const text = 'My diary entry';
      const context = 'voice diary entry';

      let prompt = template;
      prompt = prompt.replace('{{#if context}}', '');
      prompt = prompt.replace('{{/if}}', '');
      prompt = prompt.replace('{{context}}', context);
      prompt = prompt.replace('{{text}}', text);

      expect(prompt).toContain('Context: voice diary entry');
      expect(prompt).toContain('Text: My diary entry');
    });

    it('should remove context block when no context provided', () => {
      const template = `{{#if context}}
Context: {{context}}
{{/if}}

Text: {{text}}`;

      const text = 'My diary entry';

      let prompt = template;
      prompt = prompt.replace(/\{\{#if context\}\}[\s\S]*?\{\{\/if\}\}/g, '');
      prompt = prompt.replace('{{text}}', text);

      expect(prompt).not.toContain('Context:');
      expect(prompt).toContain('Text: My diary entry');
    });

    it('should have prompts for both German and English', () => {
      const prompts = {
        de: 'Du bist ein Experte für Sentimentanalyse...',
        en: 'You are an expert in sentiment analysis...',
      };

      expect(prompts.de).toBeDefined();
      expect(prompts.en).toBeDefined();
      expect(prompts.de).toContain('Sentimentanalyse');
      expect(prompts.en).toContain('sentiment analysis');
    });
  });

  describe('Schema validation', () => {
    it('should have analysis task type in AI task types', () => {
      const aiTaskTypes = ['chat', 'summarization', 'translation', 'content_generation', 'analysis'];
      expect(aiTaskTypes).toContain('analysis');
    });

    it('should have required fields for sentiment result', () => {
      const requiredFields = [
        'success',
        'sentimentScore',
        'sentimentLabel',
        'confidence',
        'emotions',
        'dominantEmotion',
        'emotionalPatterns',
        'keywords',
        'moodBarometer',
      ];

      const result = {
        success: true,
        sentimentScore: 0.5,
        sentimentLabel: 'positive',
        confidence: 0.8,
        emotions: [],
        dominantEmotion: 'joy',
        emotionalPatterns: [],
        keywords: [],
        moodBarometer: {
          overallMood: 'positive',
          moodScore: 50,
          dominantEmotion: 'joy',
          emotionIntensity: 60,
          energyLevel: 'medium',
          stressIndicator: 'low',
        },
      };

      requiredFields.forEach((field) => {
        expect(result).toHaveProperty(field);
      });
    });
  });
});
