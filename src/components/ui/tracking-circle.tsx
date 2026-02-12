import * as React from 'react';
import { cn } from '@/lib/utils';

export type TrackingStatus = 'completed' | 'active' | 'incomplete';

interface TrackingCircleProps extends React.HTMLAttributes<HTMLDivElement> {
  status: TrackingStatus;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
};

const statusClasses = {
  completed: 'bg-rdy-black',
  active: 'bg-rdy-orange-500',
  incomplete: 'bg-rdy-gray-200',
};

export const TrackingCircle = React.forwardRef<HTMLDivElement, TrackingCircleProps>(
  ({ className, status, size = 'md', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('rounded-full', sizeClasses[size], statusClasses[status], className)}
        role="status"
        aria-label={`Status: ${status}`}
        {...props}
      />
    );
  }
);

TrackingCircle.displayName = 'TrackingCircle';
