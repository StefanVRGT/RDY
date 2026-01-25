import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { format, startOfWeek, addDays } from 'date-fns';

// Mock tRPC
const mockUseQueryTheme = vi.fn();
const mockUseQueryExercises = vi.fn();
const mockToggleCompletionMutate = vi.fn();
const mockInvalidate = vi.fn();

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    mentee: {
      getCurrentWeekTheme: {
        useQuery: () => mockUseQueryTheme(),
      },
      getExercisesForWeek: {
        useQuery: () => mockUseQueryExercises(),
      },
      toggleExerciseCompletion: {
        useMutation: () => ({
          mutate: mockToggleCompletionMutate,
          isPending: false,
        }),
      },
      updateExerciseTime: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
      rescheduleExerciseSeries: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
    },
    useUtils: () => ({
      mentee: {
        getCurrentWeekTheme: {
          invalidate: mockInvalidate,
        },
        getExercisesForWeek: {
          invalidate: mockInvalidate,
        },
        getExercisesForDate: {
          invalidate: mockInvalidate,
        },
      },
    }),
  },
}));

// Mock the mobile layout
vi.mock('@/components/mobile', () => ({
  MobileLayout: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="mobile-layout">
      <header>{title}</header>
      {children}
    </div>
  ),
}));

// Mock language provider with state
let mockLanguage = 'de';
const mockSetLanguage = vi.fn((lang: string) => {
  mockLanguage = lang;
});
const mockToggleLanguage = vi.fn(() => {
  mockLanguage = mockLanguage === 'de' ? 'en' : 'de';
});

vi.mock('@/components/providers', () => ({
  useUser: () => ({
    user: {
      id: 'test-mentee-id',
      name: 'Test Mentee',
      email: 'mentee@test.com',
      roles: ['mentee'],
    },
  }),
  useLanguage: () => ({
    language: mockLanguage,
    setLanguage: mockSetLanguage,
    toggleLanguage: mockToggleLanguage,
    t: <T extends string | null | undefined>(de: T, en: T): T => {
      if (mockLanguage === 'en' && en) {
        return en;
      }
      return de;
    },
  }),
}));

// Get current Monday
const today = new Date();
const currentMonday = startOfWeek(today, { weekStartsOn: 1 });

// Mock week theme data with herkunft and ziel fields (S6.12)
const mockWeekThemeDataComplete = {
  monthTheme: {
    id: 'month-theme-1',
    titleDe: 'Innere Ruhe',
    titleEn: 'Inner Peace',
    descriptionDe: 'Finde deine innere Ruhe und Balance im täglichen Leben',
    descriptionEn: 'Find your inner peace and balance in daily life',
    herkunftDe: 'Die Praxis der inneren Ruhe hat ihre Wurzeln in jahrtausendealten Traditionen.',
    herkunftEn: 'The practice of inner peace has its roots in ancient traditions.',
    zielDe: 'Am Ende dieses Monats wirst du tiefe Entspannung erfahren können.',
    zielEn: 'By the end of this month, you will be able to experience deep relaxation.',
    imageUrl: null,
  },
  weekTheme: {
    id: 'week-theme-1',
    weekNumber: '1',
    titleDe: 'Achtsamkeit im Alltag',
    titleEn: 'Mindfulness in Daily Life',
    descriptionDe: 'Lerne Achtsamkeit in deinen Alltag zu integrieren',
    descriptionEn: 'Learn to integrate mindfulness into your daily life',
    herkunftDe: 'Achtsamkeit wurde aus buddhistischen Traditionen entwickelt.',
    herkunftEn: 'Mindfulness was developed from Buddhist traditions.',
    zielDe: 'Tägliche Achtsamkeitsübungen etablieren',
    zielEn: 'Establish daily mindfulness practices',
  },
  weekNumber: 1,
  monthNumber: 1,
};

// Mock exercises data
const createMockExercisesData = () => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(currentMonday, i);
    const dateStr = format(date, 'yyyy-MM-dd');

    if (i < 5) {
      days.push({
        date: dateStr,
        exercises: [
          {
            id: `scheduled-${i}-1`,
            scheduledAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 7, 0),
            completed: i < 2,
            completedAt: i < 2 ? new Date() : null,
            notes: null,
            exerciseId: 'exercise-1',
            classId: 'class-1',
            exercise: {
              id: 'exercise-1',
              type: 'video' as const,
              titleDe: 'Morgen Meditation',
              titleEn: 'Morning Meditation',
              descriptionDe: 'Eine beruhigende Morgenmeditation',
              descriptionEn: 'A calming morning meditation',
              durationMinutes: 15,
            },
            isObligatory: true,
          },
        ],
        totalCount: 1,
        completedCount: i < 2 ? 1 : 0,
      });
    } else {
      days.push({
        date: dateStr,
        exercises: [],
        totalCount: 0,
        completedCount: 0,
      });
    }
  }
  return {
    weekStartDate: currentMonday.toISOString(),
    days,
  };
};

const mockExercisesData = createMockExercisesData();

// Import the component after mocks
import MenteeWeeklyCalendarPage from '@/app/mentee/calendar/weekly/page';

describe('S6.12 - Display Weekly Topic and Monthly Schwerpunkt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLanguage = 'de'; // Reset to German
    mockUseQueryTheme.mockReturnValue({
      data: mockWeekThemeDataComplete,
      isLoading: false,
    });
    mockUseQueryExercises.mockReturnValue({
      data: mockExercisesData,
      isLoading: false,
    });
  });

  describe('AC1: Weekly topic card at top of calendar', () => {
    it('displays weekly topic card prominently at top', () => {
      render(<MenteeWeeklyCalendarPage />);

      const topicCard = screen.getByTestId('week-topic-card');
      expect(topicCard).toBeInTheDocument();
    });

    it('shows week theme title when available', () => {
      render(<MenteeWeeklyCalendarPage />);

      expect(screen.getByTestId('week-theme-title')).toHaveTextContent('Achtsamkeit im Alltag');
    });

    it('shows week theme description', () => {
      render(<MenteeWeeklyCalendarPage />);

      expect(screen.getByTestId('week-theme-description')).toHaveTextContent(
        'Lerne Achtsamkeit in deinen Alltag zu integrieren'
      );
    });

    it('falls back to monthly theme when weekly theme is null', () => {
      mockUseQueryTheme.mockReturnValue({
        data: {
          ...mockWeekThemeDataComplete,
          weekTheme: null,
        },
        isLoading: false,
      });

      render(<MenteeWeeklyCalendarPage />);

      expect(screen.getByTestId('week-theme-title')).toHaveTextContent('Innere Ruhe');
    });

    it('shows weekly progress indicator', () => {
      render(<MenteeWeeklyCalendarPage />);

      expect(screen.getByTestId('weekly-progress')).toBeInTheDocument();
    });
  });

  describe('AC2: Monthly Schwerpunktebene explanation accessible', () => {
    it('has a button to view Schwerpunkt details', () => {
      render(<MenteeWeeklyCalendarPage />);

      const detailsButton = screen.getByTestId('view-schwerpunkt-details-button');
      expect(detailsButton).toBeInTheDocument();
    });

    it('opens Schwerpunkt detail dialog when button is clicked', async () => {
      render(<MenteeWeeklyCalendarPage />);

      const detailsButton = screen.getByTestId('view-schwerpunkt-details-button');
      fireEvent.click(detailsButton);

      await waitFor(() => {
        expect(screen.getByTestId('schwerpunkt-detail-dialog')).toBeInTheDocument();
      });
    });

    it('shows monthly Schwerpunkt section in dialog', async () => {
      render(<MenteeWeeklyCalendarPage />);

      fireEvent.click(screen.getByTestId('view-schwerpunkt-details-button'));

      await waitFor(() => {
        expect(screen.getByTestId('monthly-schwerpunkt-section')).toBeInTheDocument();
      });
    });

    it('displays monthly Schwerpunkt title in dialog', async () => {
      render(<MenteeWeeklyCalendarPage />);

      fireEvent.click(screen.getByTestId('view-schwerpunkt-details-button'));

      await waitFor(() => {
        expect(screen.getByTestId('monthly-schwerpunkt-title')).toHaveTextContent('Innere Ruhe');
      });
    });

    it('displays monthly Schwerpunkt description in dialog', async () => {
      render(<MenteeWeeklyCalendarPage />);

      fireEvent.click(screen.getByTestId('view-schwerpunkt-details-button'));

      await waitFor(() => {
        expect(screen.getByTestId('monthly-schwerpunkt-description')).toHaveTextContent(
          'Finde deine innere Ruhe und Balance im täglichen Leben'
        );
      });
    });

    it('can close Schwerpunkt detail dialog', async () => {
      render(<MenteeWeeklyCalendarPage />);

      fireEvent.click(screen.getByTestId('view-schwerpunkt-details-button'));

      await waitFor(() => {
        expect(screen.getByTestId('schwerpunkt-detail-dialog')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('close-schwerpunkt-dialog-button'));

      await waitFor(() => {
        expect(screen.queryByTestId('schwerpunkt-detail-dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('AC3: Herkunft (background) displayed', () => {
    it('shows Herkunft preview on week topic card', () => {
      render(<MenteeWeeklyCalendarPage />);

      expect(screen.getByTestId('week-herkunft-preview')).toBeInTheDocument();
    });

    it('displays Herkunft text in preview', () => {
      render(<MenteeWeeklyCalendarPage />);

      expect(screen.getByTestId('herkunft-text')).toHaveTextContent(
        'Achtsamkeit wurde aus buddhistischen Traditionen entwickelt.'
      );
    });

    it('shows monthly Herkunft in Schwerpunkt detail dialog', async () => {
      render(<MenteeWeeklyCalendarPage />);

      fireEvent.click(screen.getByTestId('view-schwerpunkt-details-button'));

      await waitFor(() => {
        expect(screen.getByTestId('monthly-herkunft-section')).toBeInTheDocument();
      });

      expect(screen.getByTestId('monthly-herkunft-text')).toHaveTextContent(
        'Die Praxis der inneren Ruhe hat ihre Wurzeln in jahrtausendealten Traditionen.'
      );
    });

    it('shows weekly Herkunft in Schwerpunkt detail dialog', async () => {
      render(<MenteeWeeklyCalendarPage />);

      fireEvent.click(screen.getByTestId('view-schwerpunkt-details-button'));

      await waitFor(() => {
        expect(screen.getByTestId('weekly-herkunft-section')).toBeInTheDocument();
      });

      expect(screen.getByTestId('weekly-herkunft-text')).toHaveTextContent(
        'Achtsamkeit wurde aus buddhistischen Traditionen entwickelt.'
      );
    });

    it('uses weekly Herkunft in preview when available', () => {
      render(<MenteeWeeklyCalendarPage />);

      // Should show weekly herkunft, not monthly
      expect(screen.getByTestId('herkunft-text')).toHaveTextContent(
        'Achtsamkeit wurde aus buddhistischen Traditionen entwickelt.'
      );
    });

    it('falls back to monthly Herkunft when weekly is not available', () => {
      mockUseQueryTheme.mockReturnValue({
        data: {
          ...mockWeekThemeDataComplete,
          weekTheme: {
            ...mockWeekThemeDataComplete.weekTheme,
            herkunftDe: null,
            herkunftEn: null,
          },
        },
        isLoading: false,
      });

      render(<MenteeWeeklyCalendarPage />);

      expect(screen.getByTestId('herkunft-text')).toHaveTextContent(
        'Die Praxis der inneren Ruhe hat ihre Wurzeln in jahrtausendealten Traditionen.'
      );
    });
  });

  describe('AC4: Ziel (goal) displayed', () => {
    it('shows Ziel preview on week topic card', () => {
      render(<MenteeWeeklyCalendarPage />);

      expect(screen.getByTestId('week-ziel-preview')).toBeInTheDocument();
    });

    it('displays Ziel text in preview', () => {
      render(<MenteeWeeklyCalendarPage />);

      expect(screen.getByTestId('ziel-text')).toHaveTextContent(
        'Tägliche Achtsamkeitsübungen etablieren'
      );
    });

    it('shows monthly Ziel in Schwerpunkt detail dialog', async () => {
      render(<MenteeWeeklyCalendarPage />);

      fireEvent.click(screen.getByTestId('view-schwerpunkt-details-button'));

      await waitFor(() => {
        expect(screen.getByTestId('monthly-ziel-section')).toBeInTheDocument();
      });

      expect(screen.getByTestId('monthly-ziel-text')).toHaveTextContent(
        'Am Ende dieses Monats wirst du tiefe Entspannung erfahren können.'
      );
    });

    it('shows weekly Ziel in Schwerpunkt detail dialog', async () => {
      render(<MenteeWeeklyCalendarPage />);

      fireEvent.click(screen.getByTestId('view-schwerpunkt-details-button'));

      await waitFor(() => {
        expect(screen.getByTestId('weekly-ziel-section')).toBeInTheDocument();
      });

      expect(screen.getByTestId('weekly-ziel-text')).toHaveTextContent(
        'Tägliche Achtsamkeitsübungen etablieren'
      );
    });

    it('uses weekly Ziel in preview when available', () => {
      render(<MenteeWeeklyCalendarPage />);

      // Should show weekly ziel, not monthly
      expect(screen.getByTestId('ziel-text')).toHaveTextContent(
        'Tägliche Achtsamkeitsübungen etablieren'
      );
    });

    it('falls back to monthly Ziel when weekly is not available', () => {
      mockUseQueryTheme.mockReturnValue({
        data: {
          ...mockWeekThemeDataComplete,
          weekTheme: {
            ...mockWeekThemeDataComplete.weekTheme,
            zielDe: null,
            zielEn: null,
          },
        },
        isLoading: false,
      });

      render(<MenteeWeeklyCalendarPage />);

      expect(screen.getByTestId('ziel-text')).toHaveTextContent(
        'Am Ende dieses Monats wirst du tiefe Entspannung erfahren können.'
      );
    });
  });

  describe('AC5: Bilingual support (DE/EN toggle)', () => {
    it('displays language toggle button', () => {
      render(<MenteeWeeklyCalendarPage />);

      expect(screen.getByTestId('language-toggle')).toBeInTheDocument();
    });

    it('shows DE/EN options in toggle', () => {
      render(<MenteeWeeklyCalendarPage />);

      const toggle = screen.getByTestId('language-toggle');
      expect(toggle).toHaveTextContent('DE');
      expect(toggle).toHaveTextContent('EN');
    });

    it('displays German content by default', () => {
      render(<MenteeWeeklyCalendarPage />);

      expect(screen.getByTestId('week-theme-title')).toHaveTextContent('Achtsamkeit im Alltag');
      expect(screen.getByTestId('herkunft-text')).toHaveTextContent(
        'Achtsamkeit wurde aus buddhistischen Traditionen entwickelt.'
      );
      expect(screen.getByTestId('ziel-text')).toHaveTextContent(
        'Tägliche Achtsamkeitsübungen etablieren'
      );
    });

    it('switches to English content when language is toggled', () => {
      // Set language to English for this test
      mockLanguage = 'en';

      render(<MenteeWeeklyCalendarPage />);

      expect(screen.getByTestId('week-theme-title')).toHaveTextContent('Mindfulness in Daily Life');
      expect(screen.getByTestId('herkunft-text')).toHaveTextContent(
        'Mindfulness was developed from Buddhist traditions.'
      );
      expect(screen.getByTestId('ziel-text')).toHaveTextContent(
        'Establish daily mindfulness practices'
      );
    });

    it('shows English labels when language is English', () => {
      mockLanguage = 'en';

      render(<MenteeWeeklyCalendarPage />);

      // Should show "Background" instead of "Herkunft"
      expect(screen.getByText('Background')).toBeInTheDocument();
      // Should show "Goal" instead of "Ziel"
      expect(screen.getByText('Goal')).toBeInTheDocument();
    });

    it('shows German labels when language is German', () => {
      mockLanguage = 'de';

      render(<MenteeWeeklyCalendarPage />);

      // Should show "Herkunft"
      expect(screen.getByText('Herkunft')).toBeInTheDocument();
      // Should show "Ziel"
      expect(screen.getByText('Ziel')).toBeInTheDocument();
    });

    it('Schwerpunkt dialog shows content in current language', async () => {
      mockLanguage = 'en';

      render(<MenteeWeeklyCalendarPage />);

      fireEvent.click(screen.getByTestId('view-schwerpunkt-details-button'));

      await waitFor(() => {
        expect(screen.getByTestId('monthly-schwerpunkt-title')).toHaveTextContent('Inner Peace');
        expect(screen.getByTestId('monthly-schwerpunkt-description')).toHaveTextContent(
          'Find your inner peace and balance in daily life'
        );
      });
    });

    it('dialog title changes with language', async () => {
      mockLanguage = 'en';

      render(<MenteeWeeklyCalendarPage />);

      fireEvent.click(screen.getByTestId('view-schwerpunkt-details-button'));

      await waitFor(() => {
        expect(screen.getByTestId('schwerpunkt-dialog-title')).toHaveTextContent('Focus Area Details');
      });
    });

    it('close button text changes with language', async () => {
      mockLanguage = 'de';

      render(<MenteeWeeklyCalendarPage />);

      fireEvent.click(screen.getByTestId('view-schwerpunkt-details-button'));

      await waitFor(() => {
        expect(screen.getByTestId('close-schwerpunkt-dialog-button')).toHaveTextContent('Schließen');
      });
    });

    it('view details button text changes with language', () => {
      mockLanguage = 'en';

      render(<MenteeWeeklyCalendarPage />);

      expect(screen.getByTestId('view-schwerpunkt-details-button')).toHaveTextContent(
        'View Focus Area Details'
      );
    });
  });

  describe('Integration: Weekly Theme Card interactions', () => {
    it('shows week number context in dialog', async () => {
      render(<MenteeWeeklyCalendarPage />);

      fireEvent.click(screen.getByTestId('view-schwerpunkt-details-button'));

      await waitFor(() => {
        // Should show month and week context together
        expect(screen.getByText(/Monat 1 - Woche 1/)).toBeInTheDocument();
      });
    });

    it('shows weekly theme section in dialog when weekTheme exists', async () => {
      render(<MenteeWeeklyCalendarPage />);

      fireEvent.click(screen.getByTestId('view-schwerpunkt-details-button'));

      await waitFor(() => {
        expect(screen.getByTestId('weekly-theme-section')).toBeInTheDocument();
      });
    });

    it('does not show weekly theme section when weekTheme is null', async () => {
      mockUseQueryTheme.mockReturnValue({
        data: {
          ...mockWeekThemeDataComplete,
          weekTheme: null,
        },
        isLoading: false,
      });

      render(<MenteeWeeklyCalendarPage />);

      fireEvent.click(screen.getByTestId('view-schwerpunkt-details-button'));

      await waitFor(() => {
        expect(screen.queryByTestId('weekly-theme-section')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edge cases', () => {
    it('handles null monthTheme gracefully', () => {
      mockUseQueryTheme.mockReturnValue({
        data: null,
        isLoading: false,
      });

      render(<MenteeWeeklyCalendarPage />);

      // Should not crash and should not show topic card
      expect(screen.queryByTestId('week-topic-card')).not.toBeInTheDocument();
    });

    it('handles empty herkunft gracefully', () => {
      mockUseQueryTheme.mockReturnValue({
        data: {
          ...mockWeekThemeDataComplete,
          weekTheme: {
            ...mockWeekThemeDataComplete.weekTheme,
            herkunftDe: null,
            herkunftEn: null,
          },
          monthTheme: {
            ...mockWeekThemeDataComplete.monthTheme,
            herkunftDe: null,
            herkunftEn: null,
          },
        },
        isLoading: false,
      });

      render(<MenteeWeeklyCalendarPage />);

      // Herkunft preview should not be displayed
      expect(screen.queryByTestId('week-herkunft-preview')).not.toBeInTheDocument();
    });

    it('handles empty ziel gracefully', () => {
      mockUseQueryTheme.mockReturnValue({
        data: {
          ...mockWeekThemeDataComplete,
          weekTheme: {
            ...mockWeekThemeDataComplete.weekTheme,
            zielDe: null,
            zielEn: null,
          },
          monthTheme: {
            ...mockWeekThemeDataComplete.monthTheme,
            zielDe: null,
            zielEn: null,
          },
        },
        isLoading: false,
      });

      render(<MenteeWeeklyCalendarPage />);

      // Ziel preview should not be displayed
      expect(screen.queryByTestId('week-ziel-preview')).not.toBeInTheDocument();
    });

    it('handles loading state', () => {
      mockUseQueryTheme.mockReturnValue({
        data: null,
        isLoading: true,
      });
      mockUseQueryExercises.mockReturnValue({
        data: null,
        isLoading: true,
      });

      render(<MenteeWeeklyCalendarPage />);

      // Should show loading state and not crash
      expect(screen.getByTestId('mentee-weekly-calendar')).toBeInTheDocument();
    });
  });
});
