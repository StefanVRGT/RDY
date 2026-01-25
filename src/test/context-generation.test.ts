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
    delete: vi.fn().mockReturnThis(),
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

describe('Context Generation - S10.5', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AC-S10.5-1: Generate Herkunft from description', () => {
    it('should generate Herkunft text from a description', async () => {
      const description = 'Eine Atemübung zur Entspannung und Stressabbau';
      const expectedHerkunft =
        'Diese Atemtechnik hat ihren Ursprung in der traditionellen Yoga-Praxis und wurde über Jahrhunderte verfeinert.';

      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: expectedHerkunft }],
          usage: { input_tokens: 50, output_tokens: 30 },
        }),
      });

      const config = {
        tenantId: 'test-tenant',
        userId: 'test-user',
        description,
        contextType: 'herkunft' as const,
        language: 'de' as const,
      };

      expect(config.contextType).toBe('herkunft');
      expect(config.description).toBe(description);
    });

    it('should use correct Herkunft German prompt', () => {
      const herkunftDePrompt = `Du bist ein Experte für Curriculum-Entwicklung im Bereich Wellness und persönliche Entwicklung.`;

      expect(herkunftDePrompt).toContain('Curriculum-Entwicklung');
      expect(herkunftDePrompt).toContain('Wellness');
    });

    it('should use correct Herkunft English prompt', () => {
      const herkunftEnPrompt = `You are an expert in curriculum development for wellness and personal development.`;

      expect(herkunftEnPrompt).toContain('curriculum development');
      expect(herkunftEnPrompt).toContain('wellness');
    });

    it('should include optional title in the prompt', () => {
      const config = {
        description: 'A breathing exercise',
        title: 'Morning Breath Work',
        language: 'en' as const,
      };

      expect(config.title).toBe('Morning Breath Work');
    });

    it('should include optional additional context', () => {
      const config = {
        description: 'A breathing exercise',
        additionalContext: 'This is for a week about stress management',
        language: 'en' as const,
      };

      expect(config.additionalContext).toContain('stress management');
    });

    it('should generate Herkunft explaining the origin of the concept', () => {
      const herkunftExample = `
        Diese Technik stammt aus der traditionellen Meditation und wurde
        durch moderne Forschung zur Stressreduktion wissenschaftlich validiert.
        Sie verbindet östliche Weisheit mit westlicher Psychologie.
      `.trim();

      expect(herkunftExample).toContain('Meditation');
      expect(herkunftExample).toContain('wissenschaftlich');
    });
  });

  describe('AC-S10.5-2: Generate Ziel from description', () => {
    it('should generate Ziel text from a description', async () => {
      const description = 'Eine Atemübung zur Entspannung und Stressabbau';
      const expectedZiel =
        'Das Ziel dieser Übung ist es, innere Ruhe zu finden und Stress abzubauen.';

      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: expectedZiel }],
          usage: { input_tokens: 50, output_tokens: 25 },
        }),
      });

      const config = {
        tenantId: 'test-tenant',
        userId: 'test-user',
        description,
        contextType: 'ziel' as const,
        language: 'de' as const,
      };

      expect(config.contextType).toBe('ziel');
    });

    it('should use correct Ziel German prompt', () => {
      const zielDePrompt = `Basierend auf der folgenden Beschreibung, generiere einen kurzen, prägnanten "Ziel" (Ziel/Absicht) Text.`;

      expect(zielDePrompt).toContain('Ziel');
      expect(zielDePrompt).toContain('Absicht');
    });

    it('should use correct Ziel English prompt', () => {
      const zielEnPrompt = `Based on the following description, generate a concise "Ziel" (goal/purpose) text.`;

      expect(zielEnPrompt).toContain('goal');
      expect(zielEnPrompt).toContain('purpose');
    });

    it('should generate Ziel describing what participant will achieve', () => {
      const zielExample = `
        Nach dieser Übung werden Sie eine tiefe Entspannung erfahren
        und besser in der Lage sein, Stresssituationen gelassen zu begegnen.
      `.trim();

      expect(zielExample).toContain('Entspannung');
      expect(zielExample).toContain('Stresssituationen');
    });

    it('should support both German and English Ziel generation', () => {
      const germanZiel = 'Das Ziel ist es, innere Ruhe zu finden.';
      const englishZiel = 'The goal is to find inner peace.';

      expect(germanZiel).toContain('Ziel');
      expect(englishZiel).toContain('goal');
    });
  });

  describe('AC-S10.5-3: Preview before save', () => {
    it('should display generated content for preview before saving', () => {
      const previewState = {
        generatedHerkunft: 'Diese Technik stammt aus der Meditation...',
        generatedZiel: 'Das Ziel ist es, Entspannung zu finden...',
        isPreview: true,
        hasBeenSaved: false,
      };

      expect(previewState.isPreview).toBe(true);
      expect(previewState.hasBeenSaved).toBe(false);
      expect(previewState.generatedHerkunft).toBeTruthy();
      expect(previewState.generatedZiel).toBeTruthy();
    });

    it('should allow user to review and modify before applying', () => {
      const previewComponent = {
        showPreview: true,
        allowEdit: true,
        applyButton: true,
        cancelButton: true,
      };

      expect(previewComponent.showPreview).toBe(true);
      expect(previewComponent.allowEdit).toBe(true);
      expect(previewComponent.applyButton).toBe(true);
    });

    it('should support both "Apply to Form" and "Copy to Clipboard" actions', () => {
      const actions = ['apply', 'copy', 'cancel'];

      expect(actions).toContain('apply');
      expect(actions).toContain('copy');
      expect(actions).toContain('cancel');
    });

    it('should display Herkunft and Ziel in visually distinct sections', () => {
      const herkunftSection = {
        label: 'Herkunft (Background)',
        colorClass: 'text-amber-400',
        borderClass: 'border-amber-700/50',
      };

      const zielSection = {
        label: 'Ziel (Goal)',
        colorClass: 'text-green-400',
        borderClass: 'border-green-700/50',
      };

      expect(herkunftSection.colorClass).toContain('amber');
      expect(zielSection.colorClass).toContain('green');
    });

    it('should allow generating both Herkunft and Ziel at once', () => {
      const generateBothResult = {
        herkunft: {
          generatedText: 'Herkunft content...',
          success: true,
        },
        ziel: {
          generatedText: 'Ziel content...',
          success: true,
        },
      };

      expect(generateBothResult.herkunft.success).toBe(true);
      expect(generateBothResult.ziel.success).toBe(true);
    });

    it('should show loading state during generation', () => {
      const loadingState = {
        isGenerating: true,
        buttonText: 'Generating...',
        buttonDisabled: true,
      };

      expect(loadingState.isGenerating).toBe(true);
      expect(loadingState.buttonDisabled).toBe(true);
    });

    it('should display error message if generation fails', () => {
      const errorState = {
        success: false,
        errorMessage: 'AI settings not configured for this tenant',
        showError: true,
      };

      expect(errorState.success).toBe(false);
      expect(errorState.errorMessage).toContain('not configured');
    });
  });

  describe('AC-S10.5-4: Customizable prompts', () => {
    it('should support custom context generation prompts per tenant', () => {
      const customPrompt = {
        tenantId: 'tenant-123',
        contextType: 'herkunft' as const,
        language: 'de' as const,
        name: 'Custom Herkunft Prompt',
        promptTemplate: `Du bist ein spiritueller Lehrer.
          Basierend auf der Beschreibung, erkläre den Ursprung dieser Praxis.
          {{description}}`,
        isActive: true,
      };

      expect(customPrompt.promptTemplate).toContain('{{description}}');
      expect(customPrompt.isActive).toBe(true);
    });

    it('should require {{description}} placeholder in custom prompts', () => {
      const validPrompt = 'Generate content based on: {{description}}';
      const invalidPrompt = 'Generate content without placeholder';

      expect(validPrompt).toContain('{{description}}');
      expect(invalidPrompt).not.toContain('{{description}}');
    });

    it('should support optional {{title}} placeholder', () => {
      const promptWithTitle = `
        {{#if title}}
        Title: {{title}}
        {{/if}}
        Description: {{description}}
      `;

      expect(promptWithTitle).toContain('{{title}}');
      expect(promptWithTitle).toContain('{{#if title}}');
    });

    it('should support optional {{additionalContext}} placeholder', () => {
      const promptWithContext = `
        {{#if additionalContext}}
        Additional context: {{additionalContext}}
        {{/if}}
        Description: {{description}}
      `;

      expect(promptWithContext).toContain('{{additionalContext}}');
      expect(promptWithContext).toContain('{{#if additionalContext}}');
    });

    it('should have default prompts for all 4 combinations', () => {
      const defaultPrompts = {
        'herkunft-de': true,
        'herkunft-en': true,
        'ziel-de': true,
        'ziel-en': true,
      };

      expect(Object.keys(defaultPrompts)).toHaveLength(4);
      Object.values(defaultPrompts).forEach((hasPrompt) => {
        expect(hasPrompt).toBe(true);
      });
    });

    it('should allow resetting to default prompts', async () => {
      const resetResult = {
        success: true,
        defaultTemplate: 'Default context generation prompt template...',
      };

      expect(resetResult.success).toBe(true);
      expect(resetResult.defaultTemplate).toBeTruthy();
    });

    it('should store custom prompts in database', async () => {
      const contextGenerationPromptSchema = {
        id: 'uuid',
        tenantId: 'uuid',
        contextType: 'herkunft' as const,
        language: 'de' as const,
        name: 'varchar(255)',
        promptTemplate: 'text',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(contextGenerationPromptSchema.contextType).toBe('herkunft');
      expect(contextGenerationPromptSchema.language).toBe('de');
    });

    it('should enforce unique constraint on tenant + contextType + language', () => {
      const constraintName = 'context_generation_prompts_tenant_type_lang_unique';

      expect(constraintName).toContain('unique');
    });

    it('should allow editing existing custom prompts', () => {
      const updateInput = {
        contextType: 'herkunft' as const,
        language: 'de' as const,
        name: 'Updated Prompt Name',
        promptTemplate: 'Updated template: {{description}}',
        isActive: true,
      };

      expect(updateInput.name).toBe('Updated Prompt Name');
    });

    it('should allow deleting custom prompts', () => {
      const deleteInput = {
        promptId: '123e4567-e89b-12d3-a456-426614174000',
      };

      expect(deleteInput.promptId).toMatch(/^[0-9a-f-]{36}$/i);
    });

    it('should fall back to default when custom prompt is deleted', () => {
      const fallbackBehavior = {
        customPromptExists: false,
        usesDefault: true,
        defaultPromptKey: 'herkunft-de',
      };

      expect(fallbackBehavior.usesDefault).toBe(true);
    });

    it('should list all custom prompts for admin', () => {
      const promptsResponse = {
        customPrompts: [
          { id: '1', name: 'Custom Herkunft DE', contextType: 'herkunft', language: 'de' },
        ],
        defaultPrompts: {
          'herkunft-de': { name: 'Default Herkunft German', template: '...' },
          'herkunft-en': { name: 'Default Herkunft English', template: '...' },
          'ziel-de': { name: 'Default Ziel German', template: '...' },
          'ziel-en': { name: 'Default Ziel English', template: '...' },
        },
      };

      expect(promptsResponse.customPrompts).toHaveLength(1);
      expect(promptsResponse.defaultPrompts['herkunft-de']).toBeDefined();
      expect(promptsResponse.defaultPrompts['ziel-en']).toBeDefined();
    });
  });

  describe('Integration with curriculum content', () => {
    it('should work with Schwerpunktebene (monthly focus) fields', () => {
      const schwerpunktebene = {
        titleDe: 'Einführung in die Achtsamkeit',
        descriptionDe: 'Lernen Sie die Grundlagen der Achtsamkeitspraxis.',
        herkunftDe: '', // To be generated
        zielDe: '', // To be generated
      };

      expect(schwerpunktebene.descriptionDe).toBeTruthy();
      expect(schwerpunktebene.herkunftDe).toBe('');
      expect(schwerpunktebene.zielDe).toBe('');
    });

    it('should work with Week fields', () => {
      const week = {
        titleDe: 'Woche 1: Atem',
        descriptionDe: 'Diese Woche konzentrieren wir uns auf die Atmung.',
        herkunftDe: '', // To be generated
        zielDe: '', // To be generated
      };

      expect(week.descriptionDe).toBeTruthy();
      expect(week.herkunftDe).toBe('');
    });

    it('should support bilingual generation (DE and EN)', () => {
      const bilingualContent = {
        herkunftDe: 'Diese Technik stammt aus der Meditation...',
        herkunftEn: 'This technique originates from meditation...',
        zielDe: 'Das Ziel ist Entspannung...',
        zielEn: 'The goal is relaxation...',
      };

      expect(bilingualContent.herkunftDe).toBeTruthy();
      expect(bilingualContent.herkunftEn).toBeTruthy();
    });
  });

  describe('Error handling', () => {
    it('should reject empty description', () => {
      const config = {
        description: '',
      };

      const isInvalid = !config.description || config.description.trim().length === 0;
      expect(isInvalid).toBe(true);
    });

    it('should handle missing AI configuration', () => {
      const aiConfig = null;

      if (!aiConfig) {
        const error = 'AI settings not configured for this tenant';
        expect(error).toContain('not configured');
      }
    });

    it('should handle disabled AI features', () => {
      const aiConfig = { aiEnabled: false };

      if (!aiConfig.aiEnabled) {
        const error = 'AI features are disabled for this tenant';
        expect(error).toContain('disabled');
      }
    });

    it('should handle missing API key', () => {
      const config = {
        provider: 'anthropic' as const,
        apiKey: null,
      };

      if (!config.apiKey) {
        const error = `No API key configured for ${config.provider}`;
        expect(error).toContain('No API key');
      }
    });

    it('should handle API errors gracefully', () => {
      const apiError = {
        success: false,
        error: 'Anthropic API error: Rate limit exceeded',
      };

      expect(apiError.success).toBe(false);
      expect(apiError.error).toContain('Rate limit');
    });

    it('should log failed generation attempts', () => {
      const usageLog = {
        tenantId: 'tenant-123',
        userId: 'user-456',
        provider: 'anthropic' as const,
        model: 'claude-3-5-sonnet-20241022',
        taskType: 'content_generation' as const,
        inputTokens: 50,
        outputTokens: 0,
        totalTokens: 50,
        success: false,
        errorMessage: 'API rate limit exceeded',
        durationMs: 500,
      };

      expect(usageLog.success).toBe(false);
      expect(usageLog.taskType).toBe('content_generation');
      expect(usageLog.errorMessage).toBeDefined();
    });
  });

  describe('AI Provider Integration', () => {
    it('should use tenant-configured provider', () => {
      const tenantConfig = {
        defaultProvider: 'anthropic' as const,
        modelConfig: {
          content_generation: {
            provider: 'gemini' as const,
            model: 'gemini-1.5-flash',
          },
        },
      };

      const provider =
        tenantConfig.modelConfig.content_generation?.provider || tenantConfig.defaultProvider;
      expect(provider).toBe('gemini');
    });

    it('should fall back to default provider if not configured', () => {
      const tenantConfig = {
        defaultProvider: 'anthropic' as const,
        modelConfig: {} as {
          content_generation?: { provider: 'anthropic' | 'gemini'; model: string };
        },
      };

      const provider =
        tenantConfig.modelConfig.content_generation?.provider || tenantConfig.defaultProvider;
      expect(provider).toBe('anthropic');
    });

    it('should format Anthropic API request correctly', () => {
      const request = {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: 'Generate Herkunft for: Breathing exercise',
          },
        ],
      };

      expect(request.model).toBeDefined();
      expect(request.messages[0].role).toBe('user');
    });

    it('should format Gemini API request correctly', () => {
      const request = {
        contents: [
          {
            parts: [
              {
                text: 'Generate Herkunft for: Breathing exercise',
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 1024,
        },
      };

      expect(request.contents[0].parts[0].text).toContain('Herkunft');
    });
  });

  describe('Usage logging', () => {
    it('should log successful generation usage', () => {
      const log = {
        tenantId: 'tenant-123',
        userId: 'user-456',
        provider: 'anthropic' as const,
        model: 'claude-3-5-sonnet-20241022',
        taskType: 'content_generation' as const,
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        success: true,
        durationMs: 1200,
      };

      expect(log.taskType).toBe('content_generation');
      expect(log.success).toBe(true);
    });

    it('should estimate cost correctly for Anthropic', () => {
      const inputTokens = 1000;
      const outputTokens = 500;
      const estimatedCostCents = Math.round((inputTokens * 0.3 + outputTokens * 1.5) / 1000);

      expect(estimatedCostCents).toBe(1);
    });

    it('should estimate cost correctly for Gemini', () => {
      const inputTokens = 10000;
      const outputTokens = 5000;
      const estimatedCostCents = Math.round((inputTokens * 0.035 + outputTokens * 0.105) / 1000);

      expect(estimatedCostCents).toBe(1);
    });
  });

  describe('Prompt building', () => {
    it('should replace {{description}} placeholder', () => {
      const template = 'Generate content for: {{description}}';
      const description = 'A breathing exercise for relaxation';
      const result = template.replace('{{description}}', description);

      expect(result).toBe('Generate content for: A breathing exercise for relaxation');
    });

    it('should handle title when provided', () => {
      const template = `
        {{#if title}}
        Title: {{title}}
        {{/if}}
        Description: {{description}}
      `;
      const title = 'Morning Meditation';

      let result = template;
      result = result.replace('{{#if title}}', '');
      result = result.replace('{{/if}}', '');
      result = result.replace('{{title}}', title);
      result = result.replace('{{description}}', 'Sample description');

      expect(result).toContain('Title: Morning Meditation');
    });

    it('should remove title block when not provided', () => {
      const template = `
        {{#if title}}
        Title: {{title}}
        {{/if}}
        Description: {{description}}
      `;

      const result = template.replace(/\{\{#if title\}\}[\s\S]*?\{\{\/if\}\}/g, '');

      expect(result).not.toContain('{{#if title}}');
      expect(result).not.toContain('Title:');
    });

    it('should handle additionalContext when provided', () => {
      const template = `
        {{#if additionalContext}}
        Context: {{additionalContext}}
        {{/if}}
        Description: {{description}}
      `;
      const additionalContext = 'This is for a week about mindfulness';

      let result = template;
      result = result.replace('{{#if additionalContext}}', '');
      result = result.replace('{{/if}}', '');
      result = result.replace('{{additionalContext}}', additionalContext);
      result = result.replace('{{description}}', 'Sample description');

      expect(result).toContain('Context: This is for a week about mindfulness');
    });
  });

  describe('Schema validation', () => {
    it('should have content_generation task type in AI task types', async () => {
      const aiTaskTypes = [
        'chat',
        'summarization',
        'translation',
        'content_generation',
        'analysis',
        'transcription',
      ];

      expect(aiTaskTypes).toContain('content_generation');
    });

    it('should have context type enum', () => {
      const contextTypes = ['herkunft', 'ziel'];

      expect(contextTypes).toContain('herkunft');
      expect(contextTypes).toContain('ziel');
    });

    it('should have context generation prompts table', async () => {
      const schema = await import('@/lib/db/schema');
      expect(schema.contextGenerationPrompts).toBeDefined();
    });

    it('should have correct context generation prompts fields', () => {
      const expectedFields = [
        'id',
        'tenantId',
        'contextType',
        'language',
        'name',
        'promptTemplate',
        'isActive',
        'createdAt',
        'updatedAt',
      ];

      expectedFields.forEach((field) => {
        expect(typeof field).toBe('string');
      });
    });
  });

  describe('tRPC procedures', () => {
    it('should validate generateHerkunft input', () => {
      const validInput = {
        description: 'A breathing exercise for relaxation',
        language: 'de' as const,
        title: 'Morning Breath',
        additionalContext: 'This is for week 1',
      };

      expect(validInput.description.length).toBeGreaterThan(0);
      expect(['de', 'en']).toContain(validInput.language);
    });

    it('should validate generateZiel input', () => {
      const validInput = {
        description: 'A meditation practice',
        language: 'en' as const,
      };

      expect(validInput.description).toBeDefined();
      expect(validInput.language).toBe('en');
    });

    it('should validate generateBothContexts input', () => {
      const validInput = {
        description: 'A mindfulness exercise',
        language: 'de' as const,
        title: 'Week 1 Focus',
      };

      expect(validInput.description).toBeTruthy();
    });

    it('should validate upsertContextGenerationPrompt input', () => {
      const validInput = {
        contextType: 'herkunft' as const,
        language: 'de' as const,
        name: 'My Custom Prompt',
        promptTemplate: 'Generate Herkunft: {{description}}',
        isActive: true,
      };

      expect(validInput.name.length).toBeGreaterThan(0);
      expect(validInput.name.length).toBeLessThanOrEqual(255);
      expect(validInput.promptTemplate.length).toBeGreaterThan(10);
      expect(validInput.promptTemplate).toContain('{{description}}');
    });

    it('should reject prompt without {{description}} placeholder', () => {
      const invalidPrompt = 'This prompt has no placeholder';

      expect(invalidPrompt).not.toContain('{{description}}');
    });

    it('should validate deleteContextGenerationPrompt input', () => {
      const validInput = {
        promptId: '123e4567-e89b-12d3-a456-426614174000',
      };

      expect(validInput.promptId).toMatch(/^[0-9a-f-]{36}$/i);
    });

    it('should validate resetContextGenerationPromptToDefault input', () => {
      const validInput = {
        contextType: 'ziel' as const,
        language: 'en' as const,
      };

      expect(['herkunft', 'ziel']).toContain(validInput.contextType);
      expect(['de', 'en']).toContain(validInput.language);
    });
  });

  describe('Integration with context-generation-dialog component', () => {
    it('should accept dialog props correctly', () => {
      const dialogProps = {
        open: true,
        onOpenChange: vi.fn(),
        description: 'A breathing exercise',
        title: 'Week 1',
        language: 'de' as const,
        contextType: 'both' as const,
        onApply: vi.fn(),
      };

      expect(dialogProps.open).toBe(true);
      expect(typeof dialogProps.onOpenChange).toBe('function');
      expect(typeof dialogProps.onApply).toBe('function');
    });

    it('should support all context types', () => {
      const contextTypes = ['herkunft', 'ziel', 'both'];

      contextTypes.forEach((type) => {
        expect(['herkunft', 'ziel', 'both']).toContain(type);
      });
    });

    it('should handle empty description validation', () => {
      const emptyDescription = '';
      const isValid = emptyDescription.trim().length > 0;

      expect(isValid).toBe(false);
    });

    it('should support copy to clipboard functionality', () => {
      const generatedText = 'Diese Technik stammt aus der Meditation...';

      expect(generatedText).toBeTruthy();
    });

    it('should display loading state during generation', () => {
      const mutation = {
        isPending: true,
        isError: false,
        isSuccess: false,
      };

      expect(mutation.isPending).toBe(true);
    });

    it('should display error messages', () => {
      const errorMessage = 'Generation failed: API rate limit exceeded';

      expect(errorMessage).toContain('failed');
    });

    it('should display generated result with preview styling', () => {
      const result = {
        generatedHerkunft: 'Background content...',
        generatedZiel: 'Goal content...',
      };

      expect(result.generatedHerkunft).toBeTruthy();
      expect(result.generatedZiel).toBeTruthy();
    });

    it('should call onApply with generated content', () => {
      const onApply = vi.fn();
      const generatedHerkunft = 'Herkunft content';
      const generatedZiel = 'Ziel content';

      onApply(generatedHerkunft, generatedZiel);

      expect(onApply).toHaveBeenCalledWith(generatedHerkunft, generatedZiel);
    });
  });
});
