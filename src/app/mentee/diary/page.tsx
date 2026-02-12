'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, ArrowLeft, ArrowRight } from 'lucide-react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { RdyHeader } from '@/components/ui/rdy-header';

export default function DiaryPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const [diaryText, setDiaryText] = useState('');

  const isTodaySelected = isToday(currentDate);
  const isLoading = false;

  // TODO: Implement diary API endpoints
  // const utils = trpc.useUtils();
  // const { data: diaryData, isLoading } = trpc.mentee.getDiaryEntry.useQuery({
  //   date: startOfDay(currentDate).toISOString(),
  // });

  // const updateDiary = trpc.mentee.updateDiaryEntry.useMutation({
  //   onSuccess: () => {
  //     utils.mentee.getDiaryEntry.invalidate();
  //   },
  // });

  // Navigation handlers
  const goToPreviousDay = useCallback(() => {
    setCurrentDate((prev) => subDays(prev, 1));
  }, []);

  const goToNextDay = useCallback(() => {
    setCurrentDate((prev) => addDays(prev, 1));
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    // TODO: Implement diary save
    // updateDiary.mutate({
    //   date: startOfDay(currentDate).toISOString(),
    //   content: diaryText,
    // });
    console.log('Saving diary entry:', diaryText);
    alert('Diary saved! (Note: Backend integration pending)');
  }, [diaryText]);

  return (
    <div className="min-h-screen bg-rdy-white">
      {/* Hamburger Menu */}
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 active:opacity-60 transition-opacity"
          aria-label="Menu"
        >
          <Menu className="h-6 w-6 text-rdy-black" />
        </button>
      </div>

      {/* Menu Overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-rdy-black/50 z-40"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="bg-rdy-white w-64 h-full p-rdy-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="space-y-rdy-md mt-16">
              <button
                onClick={() => {
                  router.push('/mentee/calendar');
                  setMenuOpen(false);
                }}
                className="rdy-btn-primary w-full text-left"
              >
                TODAY
              </button>
              <button
                onClick={() => {
                  router.push('/mentee/calendar/tracking');
                  setMenuOpen(false);
                }}
                className="rdy-btn-primary w-full text-left"
              >
                TRACKING
              </button>
              <button
                onClick={() => {
                  router.push('/mentee/diary');
                  setMenuOpen(false);
                }}
                className="rdy-btn-primary w-full text-left"
              >
                DIARY
              </button>
              <button
                onClick={() => {
                  router.push('/mentee/settings');
                  setMenuOpen(false);
                }}
                className="rdy-btn-primary w-full text-left"
              >
                SETTINGS
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="rdy-content-width px-rdy-lg pt-16 pb-20">
        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-rdy-md">
          <button
            onClick={goToPreviousDay}
            className="p-2 active:opacity-60 transition-opacity"
            aria-label="Previous day"
          >
            <ArrowLeft className="h-5 w-5 text-rdy-gray-500" />
          </button>

          {!isTodaySelected && (
            <button
              onClick={goToToday}
              className="text-rdy-sm uppercase text-rdy-orange-500 font-medium"
            >
              Back to Today
            </button>
          )}

          <button
            onClick={goToNextDay}
            className="p-2 active:opacity-60 transition-opacity"
            aria-label="Next day"
          >
            <ArrowRight className="h-5 w-5 text-rdy-gray-500" />
          </button>
        </div>

        {/* Header */}
        <div className="mb-rdy-xl">
          <RdyHeader
            title="DIARY"
            subtitle={format(currentDate, 'd MMM').toUpperCase()}
          />
        </div>

        {/* Diary Entry */}
        {isLoading ? (
          <div className="flex items-center justify-center py-rdy-xl">
            <div className="w-10 h-10 rounded-full bg-rdy-orange-500 animate-pulse" />
          </div>
        ) : (
          <div className="space-y-rdy-lg">
            <textarea
              value={diaryText}
              onChange={(e) => setDiaryText(e.target.value)}
              placeholder="Write your thoughts here..."
              className="w-full min-h-[300px] p-rdy-md bg-transparent border-none text-rdy-base text-rdy-gray-600 placeholder:text-rdy-gray-300 focus:outline-none resize-none"
            />

            {/* Save Button */}
            <div className="flex justify-center">
              <button
                onClick={handleSave}
                className="rdy-btn-primary text-rdy-orange-500"
              >
                SAVE
              </button>
            </div>
          </div>
        )}

        {/* RDY Branding */}
        <div className="mt-rdy-2xl text-center">
          <p className="text-rdy-lg font-bold text-rdy-black tracking-wide">RDY</p>
        </div>
      </div>
    </div>
  );
}
