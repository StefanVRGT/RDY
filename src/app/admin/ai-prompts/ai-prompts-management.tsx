'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type AIPromptCategory =
  | 'translation'
  | 'context_generation'
  | 'summarization'
  | 'chat'
  | 'analysis'
  | 'transcription'
  | 'custom';

const CATEGORY_LABELS: Record<AIPromptCategory, { label: string; color: string }> = {
  translation: { label: 'Translation', color: 'bg-blue-500/20 text-rdy-orange-500' },
  context_generation: { label: 'Context Generation', color: 'bg-rdy-orange-500/10 text-rdy-orange-500' },
  summarization: { label: 'Summarization', color: 'bg-green-500/20 text-green-400' },
  chat: { label: 'Chat', color: 'bg-yellow-500/20 text-yellow-400' },
  analysis: { label: 'Analysis', color: 'bg-orange-500/20 text-rdy-orange-500' },
  transcription: { label: 'Transcription', color: 'bg-pink-500/20 text-pink-400' },
  custom: { label: 'Custom', color: 'bg-gray-500/20 text-rdy-gray-400' },
};

interface PromptForm {
  promptKey: string;
  name: string;
  description: string;
  category: AIPromptCategory;
  promptTemplate: string;
  systemMessage: string;
  variables: string[];
  isActive: boolean;
}

const initialPromptForm: PromptForm = {
  promptKey: '',
  name: '',
  description: '',
  category: 'custom',
  promptTemplate: '',
  systemMessage: '',
  variables: [],
  isActive: true,
};

export function AIPromptsManagement() {
  const [selectedCategory, setSelectedCategory] = useState<AIPromptCategory | 'all'>('all');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<{
    id: string;
    promptKey: string;
    name: string;
    description: string | null;
    category: AIPromptCategory;
    promptTemplate: string;
    systemMessage: string | null;
    defaultPromptTemplate: string;
    defaultSystemMessage: string | null;
    variables: string[];
    isActive: boolean;
    isSystem: boolean;
  } | null>(null);
  const [promptForm, setPromptForm] = useState<PromptForm>(initialPromptForm);
  const [testVariables, setTestVariables] = useState<Record<string, string>>({});
  const [variableInput, setVariableInput] = useState('');

  const utils = trpc.useUtils();

  const { data: prompts, isLoading, error } = trpc.aiPrompts.list.useQuery({
    category: selectedCategory === 'all' ? undefined : selectedCategory,
    includeInactive: true,
  });

  const { data: categories } = trpc.aiPrompts.getCategories.useQuery();

  const createMutation = trpc.aiPrompts.create.useMutation({
    onSuccess: () => {
      utils.aiPrompts.list.invalidate();
      setShowCreateDialog(false);
      setPromptForm(initialPromptForm);
    },
  });

  const updateMutation = trpc.aiPrompts.update.useMutation({
    onSuccess: () => {
      utils.aiPrompts.list.invalidate();
      setShowEditDialog(false);
      setEditingPrompt(null);
    },
  });

  const deleteMutation = trpc.aiPrompts.delete.useMutation({
    onSuccess: () => {
      utils.aiPrompts.list.invalidate();
    },
  });

  const resetMutation = trpc.aiPrompts.resetToDefault.useMutation({
    onSuccess: () => {
      utils.aiPrompts.list.invalidate();
      setShowEditDialog(false);
      setEditingPrompt(null);
    },
  });

  const toggleActiveMutation = trpc.aiPrompts.toggleActive.useMutation({
    onSuccess: () => {
      utils.aiPrompts.list.invalidate();
    },
  });

  const seedDefaultsMutation = trpc.aiPrompts.seedDefaults.useMutation({
    onSuccess: () => {
      utils.aiPrompts.list.invalidate();
    },
  });

  const testPromptMutation = trpc.aiPrompts.testPrompt.useMutation();

  const handleOpenEdit = (prompt: typeof prompts extends (infer T)[] | undefined ? T : never) => {
    if (!prompt) return;
    setEditingPrompt({
      id: prompt.id,
      promptKey: prompt.promptKey,
      name: prompt.name,
      description: prompt.description,
      category: prompt.category as AIPromptCategory,
      promptTemplate: prompt.promptTemplate,
      systemMessage: prompt.systemMessage,
      defaultPromptTemplate: prompt.defaultPromptTemplate,
      defaultSystemMessage: prompt.defaultSystemMessage,
      variables: prompt.variables as string[],
      isActive: prompt.isActive,
      isSystem: prompt.isSystem,
    });
    setShowEditDialog(true);
  };

  const handleOpenTest = (prompt: typeof prompts extends (infer T)[] | undefined ? T : never) => {
    if (!prompt) return;
    setEditingPrompt({
      id: prompt.id,
      promptKey: prompt.promptKey,
      name: prompt.name,
      description: prompt.description,
      category: prompt.category as AIPromptCategory,
      promptTemplate: prompt.promptTemplate,
      systemMessage: prompt.systemMessage,
      defaultPromptTemplate: prompt.defaultPromptTemplate,
      defaultSystemMessage: prompt.defaultSystemMessage,
      variables: prompt.variables as string[],
      isActive: prompt.isActive,
      isSystem: prompt.isSystem,
    });
    // Initialize test variables
    const initialVars: Record<string, string> = {};
    (prompt.variables as string[]).forEach((v) => {
      initialVars[v] = '';
    });
    setTestVariables(initialVars);
    setShowTestDialog(true);
  };

  const handleSaveEdit = () => {
    if (!editingPrompt) return;

    updateMutation.mutate({
      id: editingPrompt.id,
      name: editingPrompt.name,
      description: editingPrompt.description,
      promptTemplate: editingPrompt.promptTemplate,
      systemMessage: editingPrompt.systemMessage,
      variables: editingPrompt.variables,
      isActive: editingPrompt.isActive,
    });
  };

  const handleResetToDefault = () => {
    if (!editingPrompt) return;
    resetMutation.mutate({ id: editingPrompt.id });
  };

  const handleTestPrompt = () => {
    if (!editingPrompt) return;

    testPromptMutation.mutate({
      promptTemplate: editingPrompt.promptTemplate,
      systemMessage: editingPrompt.systemMessage || undefined,
      variables: testVariables,
    });
  };

  const handleCreatePrompt = () => {
    createMutation.mutate({
      promptKey: promptForm.promptKey,
      name: promptForm.name,
      description: promptForm.description || undefined,
      category: promptForm.category,
      promptTemplate: promptForm.promptTemplate,
      systemMessage: promptForm.systemMessage || undefined,
      variables: promptForm.variables,
      isActive: promptForm.isActive,
    });
  };

  const handleAddVariable = () => {
    if (variableInput.trim() && !promptForm.variables.includes(variableInput.trim())) {
      setPromptForm({
        ...promptForm,
        variables: [...promptForm.variables, variableInput.trim()],
      });
      setVariableInput('');
    }
  };

  const handleRemoveVariable = (variable: string) => {
    setPromptForm({
      ...promptForm,
      variables: promptForm.variables.filter((v) => v !== variable),
    });
  };

  const hasChanges = editingPrompt
    ? editingPrompt.promptTemplate !== editingPrompt.defaultPromptTemplate ||
      editingPrompt.systemMessage !== editingPrompt.defaultSystemMessage
    : false;

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-500">
        Error loading prompts: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <Card className="border-rdy-gray-200 bg-rdy-gray-100">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Select
              value={selectedCategory}
              onValueChange={(value) => setSelectedCategory(value as AIPromptCategory | 'all')}
            >
              <SelectTrigger className="w-[200px] border-rdy-gray-200 bg-rdy-gray-100 text-rdy-black">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent className="border-rdy-gray-200 bg-rdy-gray-100">
                <SelectItem value="all" className="text-rdy-black">
                  All Categories
                </SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value} className="text-rdy-black">
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-rdy-gray-200 text-rdy-gray-600 hover:bg-rdy-gray-200"
              onClick={() => seedDefaultsMutation.mutate()}
              disabled={seedDefaultsMutation.isPending}
            >
              {seedDefaultsMutation.isPending ? 'Seeding...' : 'Seed Default Prompts'}
            </Button>
            <Button
              onClick={() => {
                setPromptForm(initialPromptForm);
                setShowCreateDialog(true);
              }}
            >
              Create Custom Prompt
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Prompts List */}
      <Card className="border-rdy-gray-200 bg-rdy-gray-100">
        <CardHeader>
          <CardTitle className="text-rdy-black">AI Prompts</CardTitle>
          <CardDescription className="text-rdy-gray-400">
            Manage and customize AI prompts used throughout the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-rdy-gray-400">Loading prompts...</div>
          ) : prompts && prompts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-rdy-gray-200">
                  <TableHead className="text-rdy-gray-400">Name</TableHead>
                  <TableHead className="text-rdy-gray-400">Key</TableHead>
                  <TableHead className="text-rdy-gray-400">Category</TableHead>
                  <TableHead className="text-rdy-gray-400">Status</TableHead>
                  <TableHead className="text-rdy-gray-400">Type</TableHead>
                  <TableHead className="text-right text-rdy-gray-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prompts.map((prompt) => (
                  <TableRow key={prompt.id} className="border-rdy-gray-200">
                    <TableCell className="text-rdy-black">
                      <div>
                        <div className="font-medium">{prompt.name}</div>
                        {prompt.description && (
                          <div className="text-sm text-rdy-gray-400">{prompt.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-rdy-gray-600">
                      <code className="rounded bg-rdy-gray-100 px-2 py-1 text-sm">
                        {prompt.promptKey}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          CATEGORY_LABELS[prompt.category as AIPromptCategory]?.color ||
                          'bg-gray-500/20 text-rdy-gray-400'
                        }
                      >
                        {CATEGORY_LABELS[prompt.category as AIPromptCategory]?.label ||
                          prompt.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={prompt.isActive}
                        onCheckedChange={() => toggleActiveMutation.mutate({ id: prompt.id })}
                        disabled={toggleActiveMutation.isPending}
                      />
                    </TableCell>
                    <TableCell>
                      {prompt.isSystem ? (
                        <Badge className="bg-blue-500/20 text-rdy-orange-500">System</Badge>
                      ) : (
                        <Badge className="bg-gray-500/20 text-rdy-gray-400">Custom</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rdy-gray-600 hover:text-rdy-black"
                          onClick={() => handleOpenTest(prompt)}
                        >
                          Test
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rdy-gray-600 hover:text-rdy-black"
                          onClick={() => handleOpenEdit(prompt)}
                        >
                          Edit
                        </Button>
                        {!prompt.isSystem && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this prompt?')) {
                                deleteMutation.mutate({ id: prompt.id });
                              }
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-rdy-gray-400">
              <p>No prompts configured yet.</p>
              <p className="mt-2 text-sm">
                Click &quot;Seed Default Prompts&quot; to add the system default prompts, or create
                a custom prompt.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Prompt Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-rdy-gray-200 bg-white">
          <DialogHeader>
            <DialogTitle className="text-rdy-black">
              Edit Prompt: {editingPrompt?.name}
            </DialogTitle>
            <DialogDescription className="text-rdy-gray-400">
              Customize this prompt template. Variables are enclosed in{' '}
              <code className="rounded bg-rdy-gray-100 px-1">{'{{variable}}'}</code>.
            </DialogDescription>
          </DialogHeader>
          {editingPrompt && (
            <Tabs defaultValue="template" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-rdy-gray-100">
                <TabsTrigger value="template">Template</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="template" className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-rdy-gray-600">System Message (optional)</label>
                  <Textarea
                    value={editingPrompt.systemMessage || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setEditingPrompt({ ...editingPrompt, systemMessage: e.target.value })
                    }
                    placeholder="Enter a system message for models that support it..."
                    rows={3}
                    className="border-rdy-gray-200 bg-rdy-gray-100 text-rdy-black font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-rdy-gray-600">Prompt Template</label>
                  <Textarea
                    value={editingPrompt.promptTemplate}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setEditingPrompt({ ...editingPrompt, promptTemplate: e.target.value })
                    }
                    placeholder="Enter your prompt template..."
                    rows={15}
                    className="border-rdy-gray-200 bg-rdy-gray-100 text-rdy-black font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-rdy-gray-600">Available Variables</label>
                  <div className="flex flex-wrap gap-2">
                    {editingPrompt.variables.map((v) => (
                      <Badge key={v} className="bg-rdy-gray-200 text-rdy-gray-600">
                        {`{{${v}}}`}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-rdy-gray-500">
                    Use <code className="rounded bg-rdy-gray-100 px-1">{'{{#if var}}...{{/if}}'}</code>{' '}
                    for conditional blocks
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="settings" className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-rdy-gray-600">Name</label>
                  <Input
                    value={editingPrompt.name}
                    onChange={(e) =>
                      setEditingPrompt({ ...editingPrompt, name: e.target.value })
                    }
                    className="border-rdy-gray-200 bg-rdy-gray-100 text-rdy-black"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-rdy-gray-600">Description</label>
                  <Textarea
                    value={editingPrompt.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setEditingPrompt({ ...editingPrompt, description: e.target.value })
                    }
                    placeholder="Describe what this prompt does..."
                    rows={2}
                    className="border-rdy-gray-200 bg-rdy-gray-100 text-rdy-black"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm text-rdy-gray-600">Active</label>
                    <p className="text-xs text-rdy-gray-500">
                      Inactive prompts will not be used by the system
                    </p>
                  </div>
                  <Switch
                    checked={editingPrompt.isActive}
                    onCheckedChange={(checked) =>
                      setEditingPrompt({ ...editingPrompt, isActive: checked })
                    }
                  />
                </div>
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter className="flex gap-2 sm:gap-2">
            {hasChanges && editingPrompt?.isSystem && (
              <Button
                variant="outline"
                onClick={handleResetToDefault}
                disabled={resetMutation.isPending}
                className="border-rdy-gray-200 text-rdy-gray-600 hover:bg-rdy-gray-200"
              >
                {resetMutation.isPending ? 'Resetting...' : 'Reset to Default'}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              className="border-rdy-gray-200 text-rdy-gray-600 hover:bg-rdy-gray-200"
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Prompt Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-rdy-gray-200 bg-white">
          <DialogHeader>
            <DialogTitle className="text-rdy-black">Test Prompt: {editingPrompt?.name}</DialogTitle>
            <DialogDescription className="text-rdy-gray-400">
              Enter values for the variables to test this prompt with the AI
            </DialogDescription>
          </DialogHeader>
          {editingPrompt && (
            <div className="space-y-4">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-rdy-gray-600">Variables</h4>
                {editingPrompt.variables.length > 0 ? (
                  editingPrompt.variables.map((variable) => (
                    <div key={variable} className="space-y-1">
                      <label className="text-sm text-rdy-gray-400">{variable}</label>
                      <Textarea
                        value={testVariables[variable] || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setTestVariables({ ...testVariables, [variable]: e.target.value })
                        }
                        placeholder={`Enter value for ${variable}...`}
                        rows={2}
                        className="border-rdy-gray-200 bg-rdy-gray-100 text-rdy-black"
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-rdy-gray-500">This prompt has no variables.</p>
                )}
              </div>

              {testPromptMutation.data && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-rdy-gray-600">Result</h4>
                  <div
                    className={`rounded-lg p-4 ${
                      testPromptMutation.data.success
                        ? 'bg-green-900/20 border border-green-800'
                        : 'bg-red-900/20 border border-red-800'
                    }`}
                  >
                    {testPromptMutation.data.success ? (
                      <div className="space-y-2">
                        <p className="whitespace-pre-wrap text-sm text-rdy-gray-600">
                          {testPromptMutation.data.output}
                        </p>
                        <div className="flex gap-4 text-xs text-rdy-gray-400">
                          <span>Provider: {testPromptMutation.data.provider}</span>
                          <span>Duration: {testPromptMutation.data.durationMs}ms</span>
                          {testPromptMutation.data.inputTokens !== undefined && (
                            <span>Input: {testPromptMutation.data.inputTokens} tokens</span>
                          )}
                          {testPromptMutation.data.outputTokens !== undefined && (
                            <span>Output: {testPromptMutation.data.outputTokens} tokens</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-red-400">{testPromptMutation.data.error}</p>
                    )}
                  </div>
                </div>
              )}

              {testPromptMutation.data?.processedPrompt && (
                <details className="space-y-2">
                  <summary className="cursor-pointer text-sm font-medium text-rdy-gray-400">
                    View Processed Prompt
                  </summary>
                  <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-rdy-gray-100 p-3 text-xs text-rdy-gray-600">
                    {testPromptMutation.data.processedPrompt}
                  </pre>
                </details>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTestDialog(false);
                testPromptMutation.reset();
              }}
              className="border-rdy-gray-200 text-rdy-gray-600 hover:bg-rdy-gray-200"
            >
              Close
            </Button>
            <Button onClick={handleTestPrompt} disabled={testPromptMutation.isPending}>
              {testPromptMutation.isPending ? 'Testing...' : 'Test Prompt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Prompt Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-rdy-gray-200 bg-white">
          <DialogHeader>
            <DialogTitle className="text-rdy-black">Create Custom Prompt</DialogTitle>
            <DialogDescription className="text-rdy-gray-400">
              Create a new AI prompt for custom use cases
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-rdy-gray-600">Prompt Key</label>
                <Input
                  value={promptForm.promptKey}
                  onChange={(e) =>
                    setPromptForm({ ...promptForm, promptKey: e.target.value.toLowerCase().replace(/\s+/g, '-') })
                  }
                  placeholder="e.g., custom-greeting"
                  className="border-rdy-gray-200 bg-rdy-gray-100 text-rdy-black"
                />
                <p className="text-xs text-rdy-gray-500">Unique identifier (lowercase, hyphens only)</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-rdy-gray-600">Category</label>
                <Select
                  value={promptForm.category}
                  onValueChange={(value) =>
                    setPromptForm({ ...promptForm, category: value as AIPromptCategory })
                  }
                >
                  <SelectTrigger className="border-rdy-gray-200 bg-rdy-gray-100 text-rdy-black">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="border-rdy-gray-200 bg-rdy-gray-100">
                    {categories?.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value} className="text-rdy-black">
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-rdy-gray-600">Name</label>
              <Input
                value={promptForm.name}
                onChange={(e) => setPromptForm({ ...promptForm, name: e.target.value })}
                placeholder="Display name for this prompt"
                className="border-rdy-gray-200 bg-rdy-gray-100 text-rdy-black"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-rdy-gray-600">Description</label>
              <Textarea
                value={promptForm.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPromptForm({ ...promptForm, description: e.target.value })}
                placeholder="Describe what this prompt does..."
                rows={2}
                className="border-rdy-gray-200 bg-rdy-gray-100 text-rdy-black"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-rdy-gray-600">System Message (optional)</label>
              <Textarea
                value={promptForm.systemMessage}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPromptForm({ ...promptForm, systemMessage: e.target.value })}
                placeholder="System message for models that support it..."
                rows={2}
                className="border-rdy-gray-200 bg-rdy-gray-100 text-rdy-black font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-rdy-gray-600">Prompt Template</label>
              <Textarea
                value={promptForm.promptTemplate}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPromptForm({ ...promptForm, promptTemplate: e.target.value })}
                placeholder="Enter your prompt template with {{variables}}..."
                rows={10}
                className="border-rdy-gray-200 bg-rdy-gray-100 text-rdy-black font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-rdy-gray-600">Variables</label>
              <div className="flex gap-2">
                <Input
                  value={variableInput}
                  onChange={(e) => setVariableInput(e.target.value)}
                  placeholder="Variable name"
                  className="border-rdy-gray-200 bg-rdy-gray-100 text-rdy-black"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddVariable();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddVariable}
                  className="border-rdy-gray-200 text-rdy-gray-600 hover:bg-rdy-gray-200"
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {promptForm.variables.map((v) => (
                  <Badge
                    key={v}
                    className="cursor-pointer bg-rdy-gray-200 text-rdy-gray-600 hover:bg-rdy-gray-200"
                    onClick={() => handleRemoveVariable(v)}
                  >
                    {`{{${v}}}`} x
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm text-rdy-gray-600">Active</label>
                <p className="text-xs text-rdy-gray-500">Enable this prompt for use in the system</p>
              </div>
              <Switch
                checked={promptForm.isActive}
                onCheckedChange={(checked) => setPromptForm({ ...promptForm, isActive: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              className="border-rdy-gray-200 text-rdy-gray-600 hover:bg-rdy-gray-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePrompt}
              disabled={
                createMutation.isPending ||
                !promptForm.promptKey ||
                !promptForm.name ||
                !promptForm.promptTemplate
              }
            >
              {createMutation.isPending ? 'Creating...' : 'Create Prompt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
