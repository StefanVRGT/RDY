import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MobileLayout } from './mobile-layout';

// Mock the child components
vi.mock('./bottom-navigation', () => ({
  BottomNavigation: () => <nav data-testid="bottom-nav">Bottom Nav</nav>,
}));

vi.mock('./mobile-header', () => ({
  MobileHeader: ({ title }: { title: string }) => (
    <header data-testid="mobile-header">{title}</header>
  ),
}));

describe('MobileLayout', () => {
  it('renders children content', () => {
    render(
      <MobileLayout>
        <div data-testid="content">Test Content</div>
      </MobileLayout>
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('renders header by default', () => {
    render(
      <MobileLayout title="Test Title">
        <div>Content</div>
      </MobileLayout>
    );

    expect(screen.getByTestId('mobile-header')).toBeInTheDocument();
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders bottom navigation by default', () => {
    render(
      <MobileLayout>
        <div>Content</div>
      </MobileLayout>
    );

    expect(screen.getByTestId('bottom-nav')).toBeInTheDocument();
  });

  it('can hide header when showHeader is false', () => {
    render(
      <MobileLayout showHeader={false}>
        <div>Content</div>
      </MobileLayout>
    );

    expect(screen.queryByTestId('mobile-header')).not.toBeInTheDocument();
  });

  it('can hide bottom navigation when showBottomNav is false', () => {
    render(
      <MobileLayout showBottomNav={false}>
        <div>Content</div>
      </MobileLayout>
    );

    expect(screen.queryByTestId('bottom-nav')).not.toBeInTheDocument();
  });

  it('applies mobile-optimized styling', () => {
    const { container } = render(
      <MobileLayout>
        <div>Content</div>
      </MobileLayout>
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('min-h-screen', 'flex-col', 'bg-white');
  });

  it('applies custom className', () => {
    const { container } = render(
      <MobileLayout className="custom-class">
        <div>Content</div>
      </MobileLayout>
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('custom-class');
  });

  it('uses default title when not provided', () => {
    render(
      <MobileLayout>
        <div>Content</div>
      </MobileLayout>
    );

    expect(screen.getByText('RDY')).toBeInTheDocument();
  });
});
