'use client';

import { useViewContext, type ViewMode } from '@/components/providers/view-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye } from 'lucide-react';

const viewLabels: Record<ViewMode, string> = {
  admin: 'Admin View',
  mentor: 'Mentor View',
  mentee: 'Mentee View',
};

const viewColors: Record<ViewMode, string> = {
  admin: 'text-orange-400',
  mentor: 'text-blue-400',
  mentee: 'text-green-400',
};

export function ViewSwitcher() {
  const { currentView, setCurrentView, availableViews } = useViewContext();

  // Don't render if user has only one view available
  if (availableViews.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-2" data-testid="view-switcher">
      <Eye className="h-4 w-4 text-gray-400" />
      <Select value={currentView} onValueChange={(value) => setCurrentView(value as ViewMode)}>
        <SelectTrigger
          className="w-[140px] border-gray-700 bg-gray-800 text-sm text-white hover:bg-gray-700"
          data-testid="view-switcher-trigger"
        >
          <SelectValue placeholder="Select view" />
        </SelectTrigger>
        <SelectContent className="border-gray-700 bg-gray-800">
          {availableViews.map((view) => (
            <SelectItem
              key={view}
              value={view}
              className="text-white focus:bg-gray-700 focus:text-white"
              data-testid={`view-option-${view}`}
            >
              <span className={viewColors[view]}>{viewLabels[view]}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
