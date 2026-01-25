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
        'bg-gray-800 hover:bg-gray-700',
        className
      )}
      aria-label={`Switch to ${language === 'de' ? 'English' : 'German'}`}
      data-testid="language-toggle"
    >
      <span
        className={cn(
          'transition-colors',
          language === 'de' ? 'text-white font-bold' : 'text-gray-500'
        )}
      >
        DE
      </span>
      <span className="text-gray-600">/</span>
      <span
        className={cn(
          'transition-colors',
          language === 'en' ? 'text-white font-bold' : 'text-gray-500'
        )}
      >
        EN
      </span>
    </button>
  );
}
