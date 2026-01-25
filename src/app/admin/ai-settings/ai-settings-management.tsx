'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type AIProvider = 'anthropic' | 'gemini';
type AITaskType = 'chat' | 'summarization' | 'translation' | 'content_generation' | 'analysis';

const TASK_TYPE_LABELS: Record<AITaskType, { label: string; description: string }> = {
  chat: { label: 'Chat', description: 'Conversational AI interactions' },
  summarization: { label: 'Summarization', description: 'Content summarization and condensing' },
  translation: { label: 'Translation', description: 'Language translation' },
  content_generation: { label: 'Content Generation', description: 'Creating new content and text' },
  analysis: { label: 'Analysis', description: 'Data and text analysis' },
};

const TASK_TYPES: AITaskType[] = ['chat', 'summarization', 'translation', 'content_generation', 'analysis'];

export function AISettingsManagement() {
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showModelConfigDialog, setShowModelConfigDialog] = useState(false);
  const [editingTaskType, setEditingTaskType] = useState<AITaskType | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('anthropic');
  const [selectedModel, setSelectedModel] = useState('');
  const [testResult, setTestResult] = useState<{ provider: AIProvider; valid: boolean; message: string } | null>(null);
  const [statisticsDays, setStatisticsDays] = useState<number>(30);

  const utils = trpc.useUtils();

  const { data: settings, isLoading, error } = trpc.aiSettings.getSettings.useQuery();

  const { data: usageStats, isLoading: isLoadingStats } = trpc.aiSettings.getUsageStatistics.useQuery(
    { days: statisticsDays },
    { enabled: !!settings }
  );

  const updateSettingsMutation = trpc.aiSettings.updateSettings.useMutation({
    onSuccess: () => {
      utils.aiSettings.getSettings.invalidate();
    },
  });

  const updateModelConfigMutation = trpc.aiSettings.updateModelConfig.useMutation({
    onSuccess: () => {
      utils.aiSettings.getSettings.invalidate();
      setShowModelConfigDialog(false);
      setEditingTaskType(null);
    },
  });

  const removeModelConfigMutation = trpc.aiSettings.removeModelConfig.useMutation({
    onSuccess: () => {
      utils.aiSettings.getSettings.invalidate();
    },
  });

  const toggleEnabledMutation = trpc.aiSettings.toggleEnabled.useMutation({
    onSuccess: () => {
      utils.aiSettings.getSettings.invalidate();
    },
  });

  const deleteApiKeyMutation = trpc.aiSettings.deleteApiKey.useMutation({
    onSuccess: () => {
      utils.aiSettings.getSettings.invalidate();
    },
  });

  const testApiKeyMutation = trpc.aiSettings.testApiKey.useMutation();

  const testStoredApiKeyMutation = trpc.aiSettings.testStoredApiKey.useMutation({
    onSuccess: (result, variables) => {
      setTestResult({
        provider: variables.provider,
        valid: result.valid,
        message: result.message,
      });
    },
  });

  const { data: anthropicModels } = trpc.aiSettings.getAvailableModels.useQuery(
    { provider: 'anthropic' },
    { enabled: selectedProvider === 'anthropic' && showModelConfigDialog }
  );

  const { data: geminiModels } = trpc.aiSettings.getAvailableModels.useQuery(
    { provider: 'gemini' },
    { enabled: selectedProvider === 'gemini' && showModelConfigDialog }
  );

  const [apiKeyTestResult, setApiKeyTestResult] = useState<{ valid: boolean; message: string } | null>(null);

  const handleTestApiKey = () => {
    if (!editingProvider || !apiKeyInput) return;
    setApiKeyTestResult(null);

    testApiKeyMutation.mutate(
      { provider: editingProvider, apiKey: apiKeyInput },
      {
        onSuccess: (result) => {
          setApiKeyTestResult(result);
        },
      }
    );
  };

  const handleSaveApiKey = () => {
    if (!editingProvider || !apiKeyInput) return;

    updateSettingsMutation.mutate(
      editingProvider === 'anthropic'
        ? { anthropicApiKey: apiKeyInput }
        : { geminiApiKey: apiKeyInput },
      {
        onSuccess: () => {
          setShowApiKeyDialog(false);
          setEditingProvider(null);
          setApiKeyInput('');
          setApiKeyTestResult(null);
        },
      }
    );
  };

  const handleSaveModelConfig = () => {
    if (!editingTaskType || !selectedModel) return;

    updateModelConfigMutation.mutate({
      taskType: editingTaskType,
      provider: selectedProvider,
      model: selectedModel,
    });
  };

  const openModelConfigDialog = (taskType: AITaskType) => {
    const config = settings?.modelConfig as Record<string, { provider: AIProvider; model: string }> | undefined;
    const existingConfig = config?.[taskType];

    setEditingTaskType(taskType);
    setSelectedProvider(existingConfig?.provider || settings?.defaultProvider || 'anthropic');
    setSelectedModel(existingConfig?.model || '');
    setShowModelConfigDialog(true);
  };

  const availableModels = selectedProvider === 'anthropic' ? anthropicModels : geminiModels;

  if (error) {
    return (
      <div className="rounded-lg bg-red-900/20 p-4 text-red-400">
        Error loading AI settings: {error.message}
      </div>
    );
  }

  if (isLoading || !settings) {
    return (
      <div className="space-y-6">
        <Card className="border-gray-800 bg-gray-900">
          <CardContent className="py-8 text-center text-gray-400">Loading...</CardContent>
        </Card>
      </div>
    );
  }

  const modelConfig = settings.modelConfig as Record<string, { provider: AIProvider; model: string }> | undefined;

  return (
    <div className="space-y-6">
      {/* AI Enabled Toggle */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">AI Features</CardTitle>
              <CardDescription className="text-gray-400">
                Enable or disable AI features for your organization
              </CardDescription>
            </div>
            <Switch
              checked={settings.aiEnabled}
              onCheckedChange={() => toggleEnabledMutation.mutate()}
              disabled={toggleEnabledMutation.isPending}
            />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400">
            {settings.aiEnabled
              ? 'AI features are currently enabled. Users can access AI-powered functionality.'
              : 'AI features are currently disabled. Enable to allow users to access AI-powered functionality.'}
          </p>
        </CardContent>
      </Card>

      {/* Default Provider */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader>
          <CardTitle className="text-white">Default Provider</CardTitle>
          <CardDescription className="text-gray-400">
            Select the default AI provider for your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={settings.defaultProvider}
            onValueChange={(value: AIProvider) => {
              updateSettingsMutation.mutate({ defaultProvider: value });
            }}
            disabled={updateSettingsMutation.isPending}
          >
            <SelectTrigger className="w-[200px] border-gray-700 bg-gray-800 text-white">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent className="border-gray-700 bg-gray-800">
              <SelectItem value="anthropic" className="text-white">
                Anthropic (Claude)
              </SelectItem>
              <SelectItem value="gemini" className="text-white">
                Google (Gemini)
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader>
          <CardTitle className="text-white">API Keys</CardTitle>
          <CardDescription className="text-gray-400">
            Configure API keys for AI providers. Keys are stored encrypted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Anthropic API Key */}
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-white">Anthropic API Key</h4>
                {settings.hasAnthropicKey ? (
                  <p className="text-sm text-green-400">
                    Configured: {settings.anthropicApiKeyMasked}
                  </p>
                ) : (
                  <p className="text-sm text-yellow-400">Not configured</p>
                )}
              </div>
              <div className="flex gap-2">
                {settings.hasAnthropicKey && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-gray-700 text-white hover:bg-gray-600"
                    onClick={() => {
                      setTestResult(null);
                      testStoredApiKeyMutation.mutate({ provider: 'anthropic' });
                    }}
                    disabled={testStoredApiKeyMutation.isPending}
                  >
                    {testStoredApiKeyMutation.isPending && testStoredApiKeyMutation.variables?.provider === 'anthropic'
                      ? 'Testing...'
                      : 'Test Connection'}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  onClick={() => {
                    setEditingProvider('anthropic');
                    setApiKeyInput('');
                    setApiKeyTestResult(null);
                    setShowApiKeyDialog(true);
                  }}
                >
                  {settings.hasAnthropicKey ? 'Update' : 'Add Key'}
                </Button>
                {settings.hasAnthropicKey && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => {
                      setTestResult(null);
                      deleteApiKeyMutation.mutate({ provider: 'anthropic' });
                    }}
                    disabled={deleteApiKeyMutation.isPending}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
            {testResult?.provider === 'anthropic' && (
              <div
                className={`mt-3 rounded-lg p-2 text-sm ${
                  testResult.valid
                    ? 'bg-green-900/30 text-green-400'
                    : 'bg-red-900/30 text-red-400'
                }`}
              >
                {testResult.message}
              </div>
            )}
          </div>

          {/* Gemini API Key */}
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-white">Gemini API Key</h4>
                {settings.hasGeminiKey ? (
                  <p className="text-sm text-green-400">
                    Configured: {settings.geminiApiKeyMasked}
                  </p>
                ) : (
                  <p className="text-sm text-yellow-400">Not configured</p>
                )}
              </div>
              <div className="flex gap-2">
                {settings.hasGeminiKey && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-gray-700 text-white hover:bg-gray-600"
                    onClick={() => {
                      setTestResult(null);
                      testStoredApiKeyMutation.mutate({ provider: 'gemini' });
                    }}
                    disabled={testStoredApiKeyMutation.isPending}
                  >
                    {testStoredApiKeyMutation.isPending && testStoredApiKeyMutation.variables?.provider === 'gemini'
                      ? 'Testing...'
                      : 'Test Connection'}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  onClick={() => {
                    setEditingProvider('gemini');
                    setApiKeyInput('');
                    setApiKeyTestResult(null);
                    setShowApiKeyDialog(true);
                  }}
                >
                  {settings.hasGeminiKey ? 'Update' : 'Add Key'}
                </Button>
                {settings.hasGeminiKey && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => {
                      setTestResult(null);
                      deleteApiKeyMutation.mutate({ provider: 'gemini' });
                    }}
                    disabled={deleteApiKeyMutation.isPending}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
            {testResult?.provider === 'gemini' && (
              <div
                className={`mt-3 rounded-lg p-2 text-sm ${
                  testResult.valid
                    ? 'bg-green-900/30 text-green-400'
                    : 'bg-red-900/30 text-red-400'
                }`}
              >
                {testResult.message}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Model Configuration per Task Type */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader>
          <CardTitle className="text-white">Model Configuration</CardTitle>
          <CardDescription className="text-gray-400">
            Configure which AI model to use for each task type. If not configured, the default
            provider will be used.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {TASK_TYPES.map((taskType) => {
            const config = modelConfig?.[taskType];
            return (
              <div
                key={taskType}
                className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 p-4"
              >
                <div>
                  <h4 className="font-medium text-white">{TASK_TYPE_LABELS[taskType].label}</h4>
                  <p className="text-sm text-gray-400">{TASK_TYPE_LABELS[taskType].description}</p>
                  {config ? (
                    <p className="mt-1 text-sm text-green-400">
                      {config.provider === 'anthropic' ? 'Anthropic' : 'Gemini'}: {config.model}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-gray-500">Using default provider</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    onClick={() => openModelConfigDialog(taskType)}
                  >
                    Configure
                  </Button>
                  {config && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => removeModelConfigMutation.mutate({ taskType })}
                      disabled={removeModelConfigMutation.isPending}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* API Key Dialog */}
      <Dialog open={showApiKeyDialog} onOpenChange={(open) => {
        setShowApiKeyDialog(open);
        if (!open) {
          setApiKeyTestResult(null);
        }
      }}>
        <DialogContent className="border-gray-800 bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingProvider === 'anthropic' ? 'Anthropic' : 'Gemini'} API Key
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Enter your {editingProvider === 'anthropic' ? 'Anthropic' : 'Google'} API key. The key
              will be encrypted before storage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="apiKey" className="text-sm text-gray-300">
                API Key
              </label>
              <Input
                id="apiKey"
                type="password"
                placeholder={
                  editingProvider === 'anthropic' ? 'sk-ant-...' : 'Enter your Gemini API key'
                }
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setApiKeyTestResult(null);
                }}
                className="border-gray-700 bg-gray-800 text-white"
              />
            </div>
            <p className="text-xs text-gray-500">
              {editingProvider === 'anthropic'
                ? 'You can find your API key at console.anthropic.com'
                : 'You can find your API key at ai.google.dev'}
            </p>
            {apiKeyTestResult && (
              <div
                className={`rounded-lg p-3 text-sm ${
                  apiKeyTestResult.valid
                    ? 'bg-green-900/30 text-green-400'
                    : 'bg-red-900/30 text-red-400'
                }`}
              >
                {apiKeyTestResult.message}
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowApiKeyDialog(false)}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={handleTestApiKey}
              disabled={!apiKeyInput || testApiKeyMutation.isPending}
              className="bg-gray-700 text-white hover:bg-gray-600"
            >
              {testApiKeyMutation.isPending ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button
              onClick={handleSaveApiKey}
              disabled={!apiKeyInput || updateSettingsMutation.isPending}
            >
              {updateSettingsMutation.isPending ? 'Saving...' : 'Save Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Usage Statistics */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Usage Statistics</CardTitle>
              <CardDescription className="text-gray-400">
                AI API usage and costs for your organization
              </CardDescription>
            </div>
            <Select
              value={String(statisticsDays)}
              onValueChange={(value) => setStatisticsDays(Number(value))}
            >
              <SelectTrigger className="w-[150px] border-gray-700 bg-gray-800 text-white">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent className="border-gray-700 bg-gray-800">
                <SelectItem value="7" className="text-white">Last 7 days</SelectItem>
                <SelectItem value="30" className="text-white">Last 30 days</SelectItem>
                <SelectItem value="90" className="text-white">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoadingStats ? (
            <div className="py-8 text-center text-gray-400">Loading statistics...</div>
          ) : usageStats ? (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                  <p className="text-sm text-gray-400">Total Requests</p>
                  <p className="text-2xl font-bold text-white">
                    {usageStats.totals.totalRequests.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                  <p className="text-sm text-gray-400">Total Tokens</p>
                  <p className="text-2xl font-bold text-white">
                    {usageStats.totals.totalTokens.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                  <p className="text-sm text-gray-400">Estimated Cost</p>
                  <p className="text-2xl font-bold text-white">
                    ${(usageStats.totals.totalCostCents / 100).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                  <p className="text-sm text-gray-400">Success Rate</p>
                  <p className="text-2xl font-bold text-white">
                    {usageStats.totals.totalRequests > 0
                      ? ((usageStats.totals.successCount / usageStats.totals.totalRequests) * 100).toFixed(1)
                      : 0}%
                  </p>
                </div>
              </div>

              {/* Usage by Provider */}
              {usageStats.byProvider.length > 0 && (
                <div>
                  <h4 className="mb-3 font-medium text-white">Usage by Provider</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    {usageStats.byProvider.map((stat) => (
                      <div
                        key={stat.provider}
                        className="rounded-lg border border-gray-700 bg-gray-800 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium text-white">
                            {stat.provider === 'anthropic' ? 'Anthropic' : 'Gemini'}
                          </h5>
                          <span className="text-sm text-gray-400">
                            {Number(stat.totalRequests).toLocaleString()} requests
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-gray-400">Tokens</p>
                            <p className="text-white">{(stat.totalTokens || 0).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Cost</p>
                            <p className="text-white">${((stat.totalCostCents || 0) / 100).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Errors</p>
                            <p className={stat.failureCount ? 'text-red-400' : 'text-green-400'}>
                              {stat.failureCount || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Usage by Task Type */}
              {usageStats.byTaskType.length > 0 && (
                <div>
                  <h4 className="mb-3 font-medium text-white">Usage by Task Type</h4>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="text-gray-400">Task Type</TableHead>
                        <TableHead className="text-right text-gray-400">Requests</TableHead>
                        <TableHead className="text-right text-gray-400">Tokens</TableHead>
                        <TableHead className="text-right text-gray-400">Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usageStats.byTaskType.map((stat) => (
                        <TableRow key={stat.taskType} className="border-gray-700">
                          <TableCell className="text-white">
                            {TASK_TYPE_LABELS[stat.taskType as AITaskType]?.label || stat.taskType}
                          </TableCell>
                          <TableCell className="text-right text-white">
                            {Number(stat.totalRequests).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-white">
                            {(stat.totalTokens || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-white">
                            ${((stat.totalCostCents || 0) / 100).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Recent Requests */}
              {usageStats.recentRequests.length > 0 && (
                <div>
                  <h4 className="mb-3 font-medium text-white">Recent Requests</h4>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="text-gray-400">Time</TableHead>
                        <TableHead className="text-gray-400">Provider</TableHead>
                        <TableHead className="text-gray-400">Model</TableHead>
                        <TableHead className="text-gray-400">Task</TableHead>
                        <TableHead className="text-right text-gray-400">Tokens</TableHead>
                        <TableHead className="text-right text-gray-400">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usageStats.recentRequests.map((req) => (
                        <TableRow key={req.id} className="border-gray-700">
                          <TableCell className="text-gray-300">
                            {new Date(req.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-white">
                            {req.provider === 'anthropic' ? 'Anthropic' : 'Gemini'}
                          </TableCell>
                          <TableCell className="text-gray-300">{req.model}</TableCell>
                          <TableCell className="text-gray-300">
                            {TASK_TYPE_LABELS[req.taskType as AITaskType]?.label || req.taskType}
                          </TableCell>
                          <TableCell className="text-right text-white">
                            {req.totalTokens.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs ${
                                req.success
                                  ? 'bg-green-900/30 text-green-400'
                                  : 'bg-red-900/30 text-red-400'
                              }`}
                            >
                              {req.success ? 'Success' : 'Failed'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* No data state */}
              {usageStats.totals.totalRequests === 0 && (
                <div className="py-8 text-center text-gray-400">
                  No AI usage data for the selected period. Usage will appear here once AI features are used.
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center text-gray-400">
              Unable to load usage statistics
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model Configuration Dialog */}
      <Dialog open={showModelConfigDialog} onOpenChange={setShowModelConfigDialog}>
        <DialogContent className="border-gray-800 bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-white">
              Configure {editingTaskType ? TASK_TYPE_LABELS[editingTaskType].label : ''} Model
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Select the AI provider and model for this task type.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Provider</label>
              <Select
                value={selectedProvider}
                onValueChange={(value: AIProvider) => {
                  setSelectedProvider(value);
                  setSelectedModel('');
                }}
              >
                <SelectTrigger className="border-gray-700 bg-gray-800 text-white">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent className="border-gray-700 bg-gray-800">
                  <SelectItem value="anthropic" className="text-white">
                    Anthropic (Claude)
                  </SelectItem>
                  <SelectItem value="gemini" className="text-white">
                    Google (Gemini)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Model</label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="border-gray-700 bg-gray-800 text-white">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent className="border-gray-700 bg-gray-800">
                  {availableModels?.map((model) => (
                    <SelectItem key={model.id} value={model.id} className="text-white">
                      <div>
                        <div>{model.name}</div>
                        <div className="text-xs text-gray-400">{model.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowModelConfigDialog(false)}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveModelConfig}
              disabled={!selectedModel || updateModelConfigMutation.isPending}
            >
              {updateModelConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
