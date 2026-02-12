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
  admin: 'text-rdy-orange-500',
  mentor: 'text-rdy-orange-500',
  mentee: 'text-rdy-orange-500',
};

export function ViewSwitcher() {
  const { currentView, setCurrentView, availableViews } = useViewContext();

  // Don't render if user has only one view available
  if (availableViews.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-2" data-testid="view-switcher">
      <Eye className="h-4 w-4 text-rdy-gray-400" />
      <Select value={currentView} onValueChange={(value) => setCurrentView(value as ViewMode)}>
        <SelectTrigger
          className="w-[140px] border-rdy-gray-200 bg-rdy-gray-100 text-sm text-rdy-black hover:bg-rdy-gray-200"
          data-testid="view-switcher-trigger"
        >
          <SelectValue placeholder="Select view" />
        </SelectTrigger>
        <SelectContent>
          {availableViews.map((view) => (
            <SelectItem
              key={view}
              value={view}
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
