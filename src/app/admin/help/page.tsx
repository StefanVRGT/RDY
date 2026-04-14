'use client';
import { useState, useEffect } from 'react';
import { HelpContent } from '@/components/help/help-content';

export default function AdminHelpPage() {
  const [lang, setLang] = useState<'en' | 'es'>('en');
  useEffect(() => {
    const stored = localStorage.getItem('rdy-help-lang');
    if (stored === 'en' || stored === 'es') setLang(stored);
  }, []);
  const handleLangChange = (l: 'en' | 'es') => {
    setLang(l);
    localStorage.setItem('rdy-help-lang', l);
  };
  return <HelpContent role="admin" lang={lang} onLangChange={handleLangChange} />;
}
