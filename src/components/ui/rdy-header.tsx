import * as React from 'react';
import { cn } from '@/lib/utils';

interface RdyHeaderProps {
  title: string;
  subtitle?: string;
  centered?: boolean;
  className?: string;
}

export const RdyHeader: React.FC<RdyHeaderProps> = ({
  title,
  subtitle,
  centered = true,
  className,
}) => {
  return (
    <div className={cn('space-y-2', centered && 'text-center', className)}>
      <h1 className="rdy-heading-xl">{title}</h1>
      {subtitle && <p className="rdy-subtitle">{subtitle}</p>}
    </div>
  );
};

interface RdySectionHeaderProps {
  title: string;
  className?: string;
}

export const RdySectionHeader: React.FC<RdySectionHeaderProps> = ({ title, className }) => {
  return <h2 className={cn('rdy-heading-lg', className)}>{title}</h2>;
};
