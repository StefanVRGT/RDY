import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ServiceWorkerRegistration } from './service-worker-registration';
import { InstallPrompt } from './install-prompt';

describe('ServiceWorkerRegistration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing visible', () => {
    const { container } = render(<ServiceWorkerRegistration />);
    expect(container.firstChild).toBeNull();
  });

  it('component exists and can be rendered', () => {
    expect(() => render(<ServiceWorkerRegistration />)).not.toThrow();
  });
});

describe('InstallPrompt', () => {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not show prompt when already in standalone mode', () => {
    // Mock standalone mode
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
      writable: true,
      configurable: true,
    });

    render(<InstallPrompt />);

    expect(
      screen.queryByRole('dialog', { name: /install app prompt/i })
    ).not.toBeInTheDocument();
  });

  it('shows prompt when beforeinstallprompt event is fired', async () => {
    // Mock non-standalone mode
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
      writable: true,
      configurable: true,
    });

    render(<InstallPrompt />);

    // Simulate beforeinstallprompt event
    const event = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
    };
    event.prompt = vi.fn().mockResolvedValue(undefined);
    event.userChoice = Promise.resolve({ outcome: 'dismissed' });

    fireEvent(window, event);

    await waitFor(() => {
      expect(
        screen.getByRole('dialog', { name: /install app prompt/i })
      ).toBeInTheDocument();
    });
  });

  it('saves dismiss state to localStorage when dismissed', async () => {
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
      writable: true,
      configurable: true,
    });

    render(<InstallPrompt />);

    // Simulate beforeinstallprompt event
    const event = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
    };
    event.prompt = vi.fn().mockResolvedValue(undefined);
    event.userChoice = Promise.resolve({ outcome: 'dismissed' });

    fireEvent(window, event);

    await waitFor(() => {
      expect(screen.getByLabelText('Dismiss')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Dismiss'));

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'rdy-install-prompt-dismissed',
      expect.any(String)
    );
  });

  it('does not show prompt if previously dismissed within 7 days', () => {
    const recentTime = Date.now() - 1 * 24 * 60 * 60 * 1000; // 1 day ago
    localStorageMock.getItem.mockReturnValue(recentTime.toString());

    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
      writable: true,
      configurable: true,
    });

    render(<InstallPrompt />);

    expect(
      screen.queryByRole('dialog', { name: /install app prompt/i })
    ).not.toBeInTheDocument();
  });
});
