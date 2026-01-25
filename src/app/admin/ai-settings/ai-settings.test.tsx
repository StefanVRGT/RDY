import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AISettingsManagement } from './ai-settings-management';

// Mock trpc
const mockInvalidate = vi.fn().mockResolvedValue(undefined);
const mockUpdateSettingsMutate = vi.fn();
const mockToggleEnabledMutate = vi.fn();
const mockUpdateModelConfigMutate = vi.fn();
const mockRemoveModelConfigMutate = vi.fn();
const mockDeleteApiKeyMutate = vi.fn();
const mockTestApiKeyMutate = vi.fn();
const mockTestStoredApiKeyMutate = vi.fn();

const mockUseUtils = vi.fn(() => ({
  aiSettings: {
    getSettings: { invalidate: mockInvalidate },
    getUsageStatistics: { invalidate: vi.fn() },
  },
}));

// Mock settings data
const mockSettings = {
  id: 'settings-1',
  tenantId: 'tenant-1',
  defaultProvider: 'anthropic' as const,
  hasAnthropicKey: true,
  hasGeminiKey: false,
  anthropicApiKeyMasked: 'sk-a...xyz1',
  geminiApiKeyMasked: null,
  modelConfig: {
    chat: { provider: 'anthropic' as const, model: 'claude-3-5-sonnet-20241022' },
  },
  aiEnabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUsageStats = {
  period: {
    days: 30,
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString(),
  },
  totals: {
    totalRequests: 100,
    totalInputTokens: 50000,
    totalOutputTokens: 25000,
    totalTokens: 75000,
    totalCostCents: 150,
    successCount: 98,
    failureCount: 2,
  },
  byProvider: [
    {
      provider: 'anthropic' as const,
      totalRequests: 100,
      totalInputTokens: 50000,
      totalOutputTokens: 25000,
      totalTokens: 75000,
      totalCostCents: 150,
      successCount: 98,
      failureCount: 2,
    },
  ],
  byTaskType: [
    {
      taskType: 'chat' as const,
      totalRequests: 80,
      totalTokens: 60000,
      totalCostCents: 120,
    },
    {
      taskType: 'summarization' as const,
      totalRequests: 20,
      totalTokens: 15000,
      totalCostCents: 30,
    },
  ],
  dailyUsage: [],
  recentRequests: [
    {
      id: 'req-1',
      provider: 'anthropic' as const,
      model: 'claude-3-5-sonnet-20241022',
      taskType: 'chat' as const,
      totalTokens: 1000,
      estimatedCostCents: 2,
      success: true,
      createdAt: new Date(),
    },
  ],
};

const mockAnthropicModels = [
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Best balance' },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most capable' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fastest' },
];

const mockGeminiModels = [
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Advanced' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast' },
];

let settingsLoading = false;
let statsLoading = false;

vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => mockUseUtils(),
    aiSettings: {
      getSettings: {
        useQuery: () => ({
          data: settingsLoading ? undefined : mockSettings,
          isLoading: settingsLoading,
          error: null,
        }),
      },
      getUsageStatistics: {
        useQuery: () => ({
          data: statsLoading ? undefined : mockUsageStats,
          isLoading: statsLoading,
          error: null,
        }),
      },
      getAvailableModels: {
        useQuery: ({ provider }: { provider: string }) => ({
          data: provider === 'anthropic' ? mockAnthropicModels : mockGeminiModels,
          isLoading: false,
        }),
      },
      updateSettings: {
        useMutation: (opts?: { onSuccess?: () => void }) => ({
          mutate: (data: unknown, callbacks?: { onSuccess?: () => void }) => {
            mockUpdateSettingsMutate(data);
            if (opts?.onSuccess) opts.onSuccess();
            if (callbacks?.onSuccess) callbacks.onSuccess();
          },
          isPending: false,
        }),
      },
      toggleEnabled: {
        useMutation: (opts?: { onSuccess?: () => void }) => ({
          mutate: () => {
            mockToggleEnabledMutate();
            if (opts?.onSuccess) opts.onSuccess();
          },
          isPending: false,
        }),
      },
      updateModelConfig: {
        useMutation: (opts?: { onSuccess?: () => void }) => ({
          mutate: (data: unknown) => {
            mockUpdateModelConfigMutate(data);
            if (opts?.onSuccess) opts.onSuccess();
          },
          isPending: false,
        }),
      },
      removeModelConfig: {
        useMutation: (opts?: { onSuccess?: () => void }) => ({
          mutate: (data: unknown) => {
            mockRemoveModelConfigMutate(data);
            if (opts?.onSuccess) opts.onSuccess();
          },
          isPending: false,
        }),
      },
      deleteApiKey: {
        useMutation: (opts?: { onSuccess?: () => void }) => ({
          mutate: (data: unknown) => {
            mockDeleteApiKeyMutate(data);
            if (opts?.onSuccess) opts.onSuccess();
          },
          isPending: false,
        }),
      },
      testApiKey: {
        useMutation: () => ({
          mutate: (data: unknown, callbacks?: { onSuccess?: (result: { valid: boolean; message: string }) => void }) => {
            mockTestApiKeyMutate(data);
            if (callbacks?.onSuccess) {
              callbacks.onSuccess({ valid: true, message: 'API key is valid.' });
            }
          },
          isPending: false,
        }),
      },
      testStoredApiKey: {
        useMutation: (opts?: { onSuccess?: (result: { valid: boolean; message: string }, variables: { provider: string }) => void }) => ({
          mutate: (data: { provider: string }) => {
            mockTestStoredApiKeyMutate(data);
            if (opts?.onSuccess) {
              opts.onSuccess({ valid: true, message: 'Connection successful.' }, data);
            }
          },
          isPending: false,
          variables: null as { provider: string } | null,
        }),
      },
    },
  },
}));

describe('AISettingsManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsLoading = false;
    statsLoading = false;
  });

  describe('Admin-only access', () => {
    it('renders AI settings page for admin users', () => {
      render(<AISettingsManagement />);

      expect(screen.getByText('AI Features')).toBeInTheDocument();
      expect(screen.getByText('Default Provider')).toBeInTheDocument();
      expect(screen.getByText('API Keys')).toBeInTheDocument();
      expect(screen.getByText('Model Configuration')).toBeInTheDocument();
      expect(screen.getByText('Usage Statistics')).toBeInTheDocument();
    });

    it('shows loading state while fetching settings', () => {
      settingsLoading = true;
      render(<AISettingsManagement />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Provider dropdown (Anthropic, Gemini)', () => {
    it('displays default provider selector with Anthropic and Gemini options', async () => {
      render(<AISettingsManagement />);

      // Find the select trigger for default provider
      const providerSection = screen.getByText('Default Provider').closest('div')?.parentElement;
      expect(providerSection).toBeInTheDocument();

      // Should show current selection
      expect(screen.getByText('Anthropic (Claude)')).toBeInTheDocument();
    });

    it('allows changing the default provider', async () => {
      render(<AISettingsManagement />);

      // Click the provider dropdown
      const trigger = screen.getAllByRole('combobox')[0];
      fireEvent.click(trigger);

      // Select Gemini
      await waitFor(() => {
        const geminiOption = screen.getByText('Google (Gemini)');
        fireEvent.click(geminiOption);
      });

      expect(mockUpdateSettingsMutate).toHaveBeenCalledWith({ defaultProvider: 'gemini' });
    });
  });

  describe('Model selection per task', () => {
    it('displays all task types with configuration options', () => {
      render(<AISettingsManagement />);

      // Check that Model Configuration section exists
      expect(screen.getByText('Model Configuration')).toBeInTheDocument();

      // Use getAllByText since task types appear in both config and stats
      expect(screen.getAllByText('Chat').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Summarization').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Translation').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Content Generation').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Analysis').length).toBeGreaterThanOrEqual(1);
    });

    it('shows configured model for task type', () => {
      render(<AISettingsManagement />);

      // Chat task has a configured model
      expect(screen.getByText('Anthropic: claude-3-5-sonnet-20241022')).toBeInTheDocument();
    });

    it('shows "Using default provider" for unconfigured tasks', () => {
      render(<AISettingsManagement />);

      // Multiple task types are not configured
      const defaultMessages = screen.getAllByText('Using default provider');
      expect(defaultMessages.length).toBeGreaterThan(0);
    });

    it('opens model configuration dialog when Configure is clicked', async () => {
      render(<AISettingsManagement />);

      // Click configure on Chat task (first one)
      const configureButtons = screen.getAllByText('Configure');
      fireEvent.click(configureButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Configure Chat Model')).toBeInTheDocument();
      });
    });

    it('allows removing model configuration', async () => {
      render(<AISettingsManagement />);

      // Chat task has a configuration, so it should have a Reset button
      const resetButton = screen.getByRole('button', { name: 'Reset' });
      fireEvent.click(resetButton);

      expect(mockRemoveModelConfigMutate).toHaveBeenCalledWith({ taskType: 'chat' });
    });
  });

  describe('API key input (masked)', () => {
    it('displays masked Anthropic API key when configured', () => {
      render(<AISettingsManagement />);

      expect(screen.getByText('Configured: sk-a...xyz1')).toBeInTheDocument();
    });

    it('shows "Not configured" for missing Gemini key', () => {
      render(<AISettingsManagement />);

      expect(screen.getByText('Not configured')).toBeInTheDocument();
    });

    it('opens API key dialog with password input type', async () => {
      render(<AISettingsManagement />);

      // Click "Add Key" for Gemini
      const addKeyButtons = screen.getAllByText('Add Key');
      fireEvent.click(addKeyButtons[0]); // Gemini is not configured

      await waitFor(() => {
        const passwordInput = screen.getByPlaceholderText('Enter your Gemini API key');
        expect(passwordInput).toHaveAttribute('type', 'password');
      });
    });

    it('allows updating existing API key', async () => {
      render(<AISettingsManagement />);

      // Click "Update" for Anthropic
      const updateButton = screen.getByRole('button', { name: 'Update' });
      fireEvent.click(updateButton);

      await waitFor(() => {
        // The dialog title should appear
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('allows removing API key', async () => {
      render(<AISettingsManagement />);

      // Find and click Remove button for Anthropic
      const removeButtons = screen.getAllByText('Remove');
      fireEvent.click(removeButtons[0]); // First remove is for Anthropic

      expect(mockDeleteApiKeyMutate).toHaveBeenCalledWith({ provider: 'anthropic' });
    });
  });

  describe('Test connection button', () => {
    it('shows Test Connection button for configured API keys', () => {
      render(<AISettingsManagement />);

      // Anthropic is configured, should have test button
      const testButtons = screen.getAllByText('Test Connection');
      expect(testButtons.length).toBeGreaterThan(0);
    });

    it('tests stored API key when Test Connection is clicked', async () => {
      render(<AISettingsManagement />);

      const testButtons = screen.getAllByText('Test Connection');
      fireEvent.click(testButtons[0]); // Test Anthropic connection

      expect(mockTestStoredApiKeyMutate).toHaveBeenCalledWith({ provider: 'anthropic' });
    });

    it('shows Test Connection button in API key dialog', async () => {
      render(<AISettingsManagement />);

      // Open API key dialog
      const updateButton = screen.getByRole('button', { name: 'Update' });
      fireEvent.click(updateButton);

      await waitFor(() => {
        // Find the Test Connection button in the dialog
        const dialogTestButton = screen.getByRole('button', { name: 'Test Connection' });
        expect(dialogTestButton).toBeInTheDocument();
      });
    });

    it('tests API key before saving in dialog', async () => {
      render(<AISettingsManagement />);

      // Open API key dialog
      const addKeyButtons = screen.getAllByText('Add Key');
      fireEvent.click(addKeyButtons[0]);

      await waitFor(async () => {
        // Enter API key
        const input = screen.getByPlaceholderText('Enter your Gemini API key');
        fireEvent.change(input, { target: { value: 'test-api-key-12345' } });

        // Click Test Connection
        const testButton = screen.getByRole('button', { name: 'Test Connection' });
        fireEvent.click(testButton);
      });

      expect(mockTestApiKeyMutate).toHaveBeenCalledWith({
        provider: 'gemini',
        apiKey: 'test-api-key-12345',
      });
    });
  });

  describe('Usage statistics display', () => {
    it('displays usage statistics section', () => {
      render(<AISettingsManagement />);

      expect(screen.getByText('Usage Statistics')).toBeInTheDocument();
    });

    it('shows total requests count', () => {
      render(<AISettingsManagement />);

      expect(screen.getByText('Total Requests')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('shows total tokens count', () => {
      render(<AISettingsManagement />);

      expect(screen.getByText('Total Tokens')).toBeInTheDocument();
      // The number may be displayed in different formats
      const tokenElements = screen.getAllByText(/75,?000/);
      expect(tokenElements.length).toBeGreaterThan(0);
    });

    it('shows estimated cost', () => {
      render(<AISettingsManagement />);

      expect(screen.getByText('Estimated Cost')).toBeInTheDocument();
      // Cost display - may appear multiple times
      const costElements = screen.getAllByText(/\$1\.50/);
      expect(costElements.length).toBeGreaterThan(0);
    });

    it('shows success rate', () => {
      render(<AISettingsManagement />);

      expect(screen.getByText('Success Rate')).toBeInTheDocument();
      expect(screen.getByText('98.0%')).toBeInTheDocument();
    });

    it('displays usage by provider', () => {
      render(<AISettingsManagement />);

      expect(screen.getByText('Usage by Provider')).toBeInTheDocument();
      // Anthropic stats shown
      expect(screen.getByText('100 requests')).toBeInTheDocument();
    });

    it('displays usage by task type', () => {
      render(<AISettingsManagement />);

      expect(screen.getByText('Usage by Task Type')).toBeInTheDocument();
      expect(screen.getByText('80')).toBeInTheDocument(); // Chat requests
      expect(screen.getByText('20')).toBeInTheDocument(); // Summarization requests
    });

    it('displays recent requests table', () => {
      render(<AISettingsManagement />);

      expect(screen.getByText('Recent Requests')).toBeInTheDocument();
      expect(screen.getByText('claude-3-5-sonnet-20241022')).toBeInTheDocument();
    });

    it('has period selector for statistics', () => {
      render(<AISettingsManagement />);

      // The period selector should exist in the Usage Statistics section
      const usageSection = screen.getByText('Usage Statistics').closest('div')?.parentElement;
      expect(usageSection).toBeInTheDocument();

      // Should have period select options - checking the default is set
      const periodSelectors = screen.getAllByRole('combobox');
      expect(periodSelectors.length).toBeGreaterThan(0);
    });

    it('shows loading state for statistics', () => {
      statsLoading = true;
      render(<AISettingsManagement />);

      expect(screen.getByText('Loading statistics...')).toBeInTheDocument();
    });
  });

  describe('AI enabled toggle', () => {
    it('shows AI enabled toggle switch', () => {
      render(<AISettingsManagement />);

      // Check for the AI Features section and enabled status message
      expect(screen.getByText('AI Features')).toBeInTheDocument();
      expect(screen.getByText(/AI features are currently enabled/)).toBeInTheDocument();
    });

    it('toggles AI enabled status', async () => {
      render(<AISettingsManagement />);

      // Find the switch and toggle it
      const toggle = screen.getByRole('switch');
      fireEvent.click(toggle);

      expect(mockToggleEnabledMutate).toHaveBeenCalled();
    });
  });
});
