import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockGetProgramTimeline = vi.fn();

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    mentee: {
      getProgramTimeline: { useQuery: () => mockGetProgramTimeline() },
    },
    useUtils: () => ({}),
  },
}));

vi.mock('@/components/mobile', () => ({
  MobileLayout: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="mobile-layout" data-title={title}>{children}</div>
  ),
}));

vi.mock('@/components/rdy-footer', () => ({
  RdyFooter: () => <div data-testid="rdy-footer">RDY</div>,
}));

vi.mock('date-fns/locale', () => ({
  de: { code: 'de', localize: { day: () => '', month: () => '' }, formatLong: { date: () => 'dd.MM.yyyy' } },
}));

import MenteeWeeklyCalendarPage from '@/app/mentee/calendar/weekly/page';

const timelineData = {
  className: 'Test Class',
  startDate: '2026-03-01T00:00:00.000Z',
  events: [
    { type: 'basics', label: 'BASICS', date: '2026-03-01T00:00:00.000Z' },
    { type: 'module', label: 'MODUL 1', date: '2026-03-08T00:00:00.000Z' },
    { type: 'module', label: 'MODUL 2', date: '2026-03-29T00:00:00.000Z' },
    { type: 'module', label: 'MODUL 3', date: '2026-04-19T00:00:00.000Z' },
    { type: 'module', label: 'MODUL 4', date: '2026-05-10T00:00:00.000Z' },
    { type: 'module', label: 'MODUL 5', date: '2026-05-31T00:00:00.000Z' },
    { type: 'endtalk', label: 'END TALK', date: '2026-06-21T00:00:00.000Z' },
  ],
};

describe('Weekly Program Timeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetProgramTimeline.mockReturnValue({
      data: timelineData,
      isLoading: false,
    });
  });

  it('shows PROGRAMM in the header', () => {
    render(<MenteeWeeklyCalendarPage />);
    const layout = screen.getByTestId('mobile-layout');
    expect(layout).toHaveAttribute('data-title', 'PROGRAMM');
  });

  it('shows RDY Masterclass sub-header', () => {
    render(<MenteeWeeklyCalendarPage />);
    expect(screen.getByText('RDY Masterclass')).toBeInTheDocument();
  });

  it('shows all 7 program events', () => {
    render(<MenteeWeeklyCalendarPage />);
    expect(screen.getByText('BASICS')).toBeInTheDocument();
    expect(screen.getByText('MODUL 1')).toBeInTheDocument();
    expect(screen.getByText('MODUL 2')).toBeInTheDocument();
    expect(screen.getByText('MODUL 3')).toBeInTheDocument();
    expect(screen.getByText('MODUL 4')).toBeInTheDocument();
    expect(screen.getByText('MODUL 5')).toBeInTheDocument();
    expect(screen.getByText('END TALK')).toBeInTheDocument();
  });

  it('shows exercise day counts between modules', () => {
    render(<MenteeWeeklyCalendarPage />);
    expect(screen.getByText('6 Tage Exercises')).toBeInTheDocument();
    expect(screen.getAllByText('20 Tage Exercises').length).toBeGreaterThanOrEqual(1);
  });

  it('renders RDY footer', () => {
    render(<MenteeWeeklyCalendarPage />);
    expect(screen.getByTestId('rdy-footer')).toBeInTheDocument();
  });

  it('shows empty state when no program assigned', () => {
    mockGetProgramTimeline.mockReturnValue({ data: null, isLoading: false });
    render(<MenteeWeeklyCalendarPage />);
    expect(screen.getByText('Kein Programm zugewiesen')).toBeInTheDocument();
  });

  it('shows spinner when loading', () => {
    mockGetProgramTimeline.mockReturnValue({ data: undefined, isLoading: true });
    render(<MenteeWeeklyCalendarPage />);
    const layout = screen.getByTestId('mobile-layout');
    expect(layout).toHaveAttribute('data-title', 'PROGRAMM');
  });
});
