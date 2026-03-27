import { AISettingsManagement } from './ai-settings-management';

export default function AISettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-rdy-black">AI Settings</h1>
        <p className="mt-1 text-rdy-gray-400">
          Configure AI providers, API keys, and model settings for your organization
        </p>
      </div>

      <AISettingsManagement />
    </div>
  );
}
