import { AIPromptsManagement } from './ai-prompts-management';

export default function AIPromptsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-rdy-black">AI Prompts Configuration</h1>
        <p className="mt-1 text-rdy-gray-400">
          Customize AI prompts used throughout the system for translation, content generation, and more
        </p>
      </div>

      <AIPromptsManagement />
    </div>
  );
}
