'use client';

import { useLanguage } from '@/components/providers';
import { cn } from '@/lib/utils';

interface LanguageToggleProps {
  className?: string;
  size?: 'sm' | 'md';
}

export function LanguageToggle({ className, size = 'md' }: LanguageToggleProps) {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className={cn(
        'flex items-center gap-1 rounded-full font-medium transition-colors',
        size === 'sm'
          ? 'px-2 py-1 text-xs'
          : 'px-3 py-1.5 text-sm',
        'bg-rdy-gray-100 hover:bg-rdy-gray-200',
        className
      )}
      aria-label={`Switch to ${language === 'de' ? 'English' : 'German'}`}
      data-testid="language-toggle"
    >
      <span
        className={cn(
          'transition-colors',
          language === 'de' ? 'text-rdy-black font-bold' : 'text-rdy-gray-400'
        )}
      >
        DE
      </span>
      <span className="text-rdy-gray-300">/</span>
      <span
        className={cn(
          'transition-colors',
          language === 'en' ? 'text-rdy-black font-bold' : 'text-rdy-gray-400'
        )}
      >
        EN
      </span>
    </button>
  );
}
