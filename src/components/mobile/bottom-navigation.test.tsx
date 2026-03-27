import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BottomNavigation } from './bottom-navigation';

// Create a mock for useViewContext that we can control
const mockUseViewContext = vi.fn(() => ({
  currentView: 'mentee' as const,
  setCurrentView: vi.fn(),
  availableViews: ['mentee' as const],
  isViewingAs: vi.fn((view: string) => view === 'mentee'),
}));

// Mock useViewContext
vi.mock('@/components/providers', () => ({
  useViewContext: () => mockUseViewContext(),
}));

// Mock usePathname
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/mentee'),
}));

describe('BottomNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseViewContext.mockReturnValue({
      currentView: 'mentee',
      setCurrentView: vi.fn(),
      availableViews: ['mentee'],
      isViewingAs: vi.fn((view: string) => view === 'mentee'),
    });
  });

  it('renders navigation element with correct role', () => {
    render(<BottomNavigation />);
    const nav = screen.getByRole('navigation', { name: /mobile navigation/i });
    expect(nav).toBeInTheDocument();
  });

  it('renders mentee navigation items when in mentee view', () => {
    render(<BottomNavigation />);

    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Week')).toBeInTheDocument();
    expect(screen.getByText('Reflect')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('renders correct hrefs for mentee navigation', () => {
    render(<BottomNavigation />);

    const todayLink = screen.getByText('Today').closest('a');
    expect(todayLink).toHaveAttribute('href', '/mentee/calendar');

    const weekLink = screen.getByText('Week').closest('a');
    expect(weekLink).toHaveAttribute('href', '/mentee/calendar/weekly');

    const reflectLink = screen.getByText('Reflect').closest('a');
    expect(reflectLink).toHaveAttribute('href', '/mentee/calendar/tracking');
  });

  it('has fixed positioning for mobile bottom bar', () => {
    render(<BottomNavigation />);
    const nav = screen.getByRole('navigation', { name: /mobile navigation/i });
    expect(nav).toHaveClass('fixed', 'bottom-0', 'left-0', 'right-0');
  });

  it('applies safe-area-inset-bottom class for PWA support', () => {
    render(<BottomNavigation />);
    const nav = screen.getByRole('navigation', { name: /mobile navigation/i });
    expect(nav).toHaveClass('safe-area-inset-bottom');
  });

  it('applies custom className when provided', () => {
    render(<BottomNavigation className="custom-class" />);
    const nav = screen.getByRole('navigation', { name: /mobile navigation/i });
    expect(nav).toHaveClass('custom-class');
  });
});

describe('BottomNavigation - Mentor View', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseViewContext.mockReturnValue({
      currentView: 'mentor',
      setCurrentView: vi.fn(),
      availableViews: ['mentor', 'mentee'],
      isViewingAs: vi.fn((view: string) => view === 'mentor'),
    });
  });

  it('renders mentor navigation items when in mentor view', () => {
    render(<BottomNavigation />);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Availability')).toBeInTheDocument();
    expect(screen.getByText('Classes')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('renders correct hrefs for mentor navigation', () => {
    render(<BottomNavigation />);

    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).toHaveAttribute('href', '/mentor');

    const availabilityLink = screen.getByText('Availability').closest('a');
    expect(availabilityLink).toHaveAttribute('href', '/mentor/availability');
  });
});
