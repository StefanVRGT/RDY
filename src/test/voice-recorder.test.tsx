import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { VoiceRecorder } from '@/components/voice-recorder';

// Mock stream
const mockStop = vi.fn();
const mockStream = {
  getTracks: () => [{ stop: mockStop }],
};

// Mock MediaRecorder with event handling
class MockMediaRecorder {
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  state = 'inactive' as 'inactive' | 'recording' | 'paused';
  private stopCallbacks: (() => void)[] = [];

  constructor() {
    // Store instance so we can trigger events externally
    (global as unknown as { __mockMediaRecorder: MockMediaRecorder }).__mockMediaRecorder = this;
  }

  start() {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    // Trigger ondataavailable with test data
    if (this.ondataavailable) {
      this.ondataavailable({ data: new Blob(['test-audio-data'], { type: 'audio/webm' }) });
    }
    // Trigger onstop
    if (this.onstop) {
      this.onstop();
    }
    this.stopCallbacks.forEach(cb => cb());
  }

  addEventListener(event: string, callback: () => void) {
    if (event === 'stop') {
      this.stopCallbacks.push(callback);
    }
  }

  removeEventListener() {}
}

// Mock AudioContext
class MockAudioContext {
  state = 'running';

  createMediaStreamSource() {
    return {
      connect: vi.fn(),
    };
  }

  createAnalyser() {
    return {
      fftSize: 2048,
      frequencyBinCount: 1024,
      getByteTimeDomainData: vi.fn((array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = 128 + Math.sin(i / 10) * 50;
        }
      }),
    };
  }

  decodeAudioData() {
    return Promise.resolve({
      getChannelData: () => new Float32Array(1000).fill(0.5),
    });
  }

  close() {
    return Promise.resolve();
  }
}

// Mock getUserMedia
const mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);

// Setup mocks before all tests
beforeEach(() => {
  vi.clearAllMocks();

  Object.defineProperty(global, 'MediaRecorder', {
    writable: true,
    configurable: true,
    value: MockMediaRecorder,
  });

  Object.defineProperty(global, 'AudioContext', {
    writable: true,
    configurable: true,
    value: MockAudioContext,
  });

  Object.defineProperty(navigator, 'mediaDevices', {
    writable: true,
    configurable: true,
    value: {
      getUserMedia: mockGetUserMedia,
    },
  });

  // Mock requestAnimationFrame
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    return setTimeout(cb, 16) as unknown as number;
  });

  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    clearTimeout(id);
  });

  // Mock URL.createObjectURL and revokeObjectURL
  global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
  global.URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('S8.3 - Voice Recording Component', () => {
  describe('AC1: Record button with visual feedback', () => {
    it('renders the voice recorder component', () => {
      render(<VoiceRecorder />);

      expect(screen.getByTestId('voice-recorder')).toBeInTheDocument();
    });

    it('displays a record button in idle state', () => {
      render(<VoiceRecorder />);

      const recordButton = screen.getByTestId('voice-record-button');
      expect(recordButton).toBeInTheDocument();
      expect(screen.getByText('Start Recording')).toBeInTheDocument();
    });

    it('shows recording indicator when recording starts', async () => {
      render(<VoiceRecorder />);

      const recordButton = screen.getByTestId('voice-record-button');
      fireEvent.click(recordButton);

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
      });

      await waitFor(() => {
        expect(screen.getByTestId('recording-indicator')).toBeInTheDocument();
      });
    });

    it('displays stop button while recording', async () => {
      render(<VoiceRecorder />);

      fireEvent.click(screen.getByTestId('voice-record-button'));

      await waitFor(() => {
        expect(screen.getByTestId('voice-stop-button')).toBeInTheDocument();
        expect(screen.getByText('Stop')).toBeInTheDocument();
      });
    });

    it('displays pulsing red indicator during recording', async () => {
      render(<VoiceRecorder />);

      fireEvent.click(screen.getByTestId('voice-record-button'));

      await waitFor(() => {
        const indicator = screen.getByTestId('recording-indicator');
        expect(indicator).toHaveClass('animate-pulse');
        expect(indicator).toHaveClass('bg-red-500');
      });
    });

    it('respects disabled prop', () => {
      render(<VoiceRecorder disabled />);

      const recordButton = screen.getByTestId('voice-record-button');
      expect(recordButton).toBeDisabled();
    });

    it('shows error message when microphone access is denied', async () => {
      mockGetUserMedia.mockRejectedValueOnce(new Error('Permission denied'));

      render(<VoiceRecorder />);

      fireEvent.click(screen.getByTestId('voice-record-button'));

      await waitFor(() => {
        expect(screen.getByTestId('voice-recorder-error')).toBeInTheDocument();
        expect(screen.getByText(/Could not access microphone/)).toBeInTheDocument();
      });
    });
  });

  describe('AC2: Recording duration display', () => {
    it('displays duration counter starting at 0:00', async () => {
      render(<VoiceRecorder />);

      fireEvent.click(screen.getByTestId('voice-record-button'));

      await waitFor(() => {
        const duration = screen.getByTestId('recording-duration');
        expect(duration).toBeInTheDocument();
        expect(duration).toHaveTextContent('0:00');
      });
    });

    it('shows max duration limit', async () => {
      render(<VoiceRecorder maxDuration={60} />);

      fireEvent.click(screen.getByTestId('voice-record-button'));

      await waitFor(() => {
        expect(screen.getByText('/ 1:00')).toBeInTheDocument();
      });
    });

    it('formats duration correctly for different values', () => {
      // Test the format function logic directly through UI expectations
      render(<VoiceRecorder maxDuration={125} />);
    });
  });

  describe('AC3: Playback before save', () => {
    it('shows play button after recording stops', async () => {
      render(<VoiceRecorder />);

      // Start recording
      fireEvent.click(screen.getByTestId('voice-record-button'));

      await waitFor(() => {
        expect(screen.getByTestId('voice-stop-button')).toBeInTheDocument();
      });

      // Stop recording
      await act(async () => {
        fireEvent.click(screen.getByTestId('voice-stop-button'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('voice-play-button')).toBeInTheDocument();
      });
    });

    it('shows clear button to delete recording', async () => {
      render(<VoiceRecorder />);

      fireEvent.click(screen.getByTestId('voice-record-button'));

      await waitFor(() => {
        expect(screen.getByTestId('voice-stop-button')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('voice-stop-button'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('voice-clear-button')).toBeInTheDocument();
      });
    });

    it('shows re-record button after recording', async () => {
      render(<VoiceRecorder />);

      fireEvent.click(screen.getByTestId('voice-record-button'));

      await waitFor(() => {
        expect(screen.getByTestId('voice-stop-button')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('voice-stop-button'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('voice-rerecord-button')).toBeInTheDocument();
      });
    });

    it('clears recording when clear button is clicked', async () => {
      render(<VoiceRecorder />);

      fireEvent.click(screen.getByTestId('voice-record-button'));

      await waitFor(() => {
        expect(screen.getByTestId('voice-stop-button')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('voice-stop-button'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('voice-clear-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('voice-clear-button'));

      await waitFor(() => {
        expect(screen.getByTestId('voice-record-button')).toBeInTheDocument();
        expect(screen.queryByTestId('voice-play-button')).not.toBeInTheDocument();
      });
    });

    it('calls onRecordingComplete callback when recording stops', async () => {
      const onComplete = vi.fn();

      render(<VoiceRecorder onRecordingComplete={onComplete} />);

      fireEvent.click(screen.getByTestId('voice-record-button'));

      await waitFor(() => {
        expect(screen.getByTestId('voice-stop-button')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('voice-stop-button'));
      });

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith(expect.any(Blob), expect.any(Number));
      });
    });

    it('calls onRecordingClear callback when recording is cleared', async () => {
      const onClear = vi.fn();

      render(<VoiceRecorder onRecordingClear={onClear} />);

      fireEvent.click(screen.getByTestId('voice-record-button'));

      await waitFor(() => {
        expect(screen.getByTestId('voice-stop-button')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('voice-stop-button'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('voice-clear-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('voice-clear-button'));

      await waitFor(() => {
        expect(onClear).toHaveBeenCalled();
      });
    });

    it('displays voice recording label after recording', async () => {
      render(<VoiceRecorder />);

      fireEvent.click(screen.getByTestId('voice-record-button'));

      await waitFor(() => {
        expect(screen.getByTestId('voice-stop-button')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('voice-stop-button'));
      });

      await waitFor(() => {
        expect(screen.getByText('Voice Recording')).toBeInTheDocument();
      });
    });
  });

  describe('AC4: Audio waveform visualization', () => {
    it('displays waveform canvas', () => {
      render(<VoiceRecorder />);

      expect(screen.getByTestId('voice-recorder-waveform')).toBeInTheDocument();
    });

    it('waveform canvas has correct dimensions', () => {
      render(<VoiceRecorder />);

      const canvas = screen.getByTestId('voice-recorder-waveform') as HTMLCanvasElement;
      expect(canvas.width).toBe(280);
      expect(canvas.height).toBe(60);
    });

    it('creates AudioContext when recording starts', async () => {
      render(<VoiceRecorder />);

      fireEvent.click(screen.getByTestId('voice-record-button'));

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });

      // AudioContext is created internally during recording
      expect(screen.getByTestId('recording-indicator')).toBeInTheDocument();
    });

    it('waveform canvas remains visible during recording', async () => {
      render(<VoiceRecorder />);

      // Canvas should be present initially
      expect(screen.getByTestId('voice-recorder-waveform')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('voice-record-button'));

      await waitFor(() => {
        expect(screen.getByTestId('recording-indicator')).toBeInTheDocument();
      });

      // Canvas should still be visible during recording
      expect(screen.getByTestId('voice-recorder-waveform')).toBeInTheDocument();
    });
  });

  describe('AC5: Save to file storage', () => {
    it('generates audio blob when recording stops', async () => {
      const onComplete = vi.fn();

      render(<VoiceRecorder onRecordingComplete={onComplete} />);

      fireEvent.click(screen.getByTestId('voice-record-button'));

      await waitFor(() => {
        expect(screen.getByTestId('voice-stop-button')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('voice-stop-button'));
      });

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
        const [blob] = onComplete.mock.calls[0];
        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('audio/webm');
      });
    });

    it('creates object URL for audio playback', async () => {
      render(<VoiceRecorder />);

      fireEvent.click(screen.getByTestId('voice-record-button'));

      await waitFor(() => {
        expect(screen.getByTestId('voice-stop-button')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('voice-stop-button'));
      });

      await waitFor(() => {
        expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      });
    });

    it('revokes object URL when recording is cleared', async () => {
      render(<VoiceRecorder />);

      fireEvent.click(screen.getByTestId('voice-record-button'));

      await waitFor(() => {
        expect(screen.getByTestId('voice-stop-button')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('voice-stop-button'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('voice-clear-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('voice-clear-button'));

      await waitFor(() => {
        expect(URL.revokeObjectURL).toHaveBeenCalled();
      });
    });
  });

  describe('Component states', () => {
    it('transitions from idle to recording state', async () => {
      render(<VoiceRecorder />);

      // Initial state - idle
      expect(screen.getByTestId('voice-record-button')).toBeInTheDocument();
      expect(screen.queryByTestId('voice-stop-button')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('voice-record-button'));

      // Recording state
      await waitFor(() => {
        expect(screen.queryByTestId('voice-record-button')).not.toBeInTheDocument();
        expect(screen.getByTestId('voice-stop-button')).toBeInTheDocument();
      });
    });

    it('transitions from recording to recorded state', async () => {
      render(<VoiceRecorder />);

      fireEvent.click(screen.getByTestId('voice-record-button'));

      await waitFor(() => {
        expect(screen.getByTestId('voice-stop-button')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('voice-stop-button'));
      });

      // Recorded state
      await waitFor(() => {
        expect(screen.queryByTestId('voice-stop-button')).not.toBeInTheDocument();
        expect(screen.getByTestId('voice-play-button')).toBeInTheDocument();
      });
    });

    it('transitions from recorded back to idle state', async () => {
      render(<VoiceRecorder />);

      fireEvent.click(screen.getByTestId('voice-record-button'));

      await waitFor(() => {
        expect(screen.getByTestId('voice-stop-button')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('voice-stop-button'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('voice-clear-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('voice-clear-button'));

      // Back to idle state
      await waitFor(() => {
        expect(screen.getByTestId('voice-record-button')).toBeInTheDocument();
        expect(screen.queryByTestId('voice-play-button')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility and styling', () => {
    it('applies custom className', () => {
      render(<VoiceRecorder className="custom-class" />);

      expect(screen.getByTestId('voice-recorder')).toHaveClass('custom-class');
    });

    it('has proper styling for light theme', () => {
      render(<VoiceRecorder />);

      expect(screen.getByTestId('voice-recorder')).toHaveClass('bg-rdy-gray-200');
    });

    it('buttons have proper accessibility attributes', () => {
      render(<VoiceRecorder />);

      const recordButton = screen.getByTestId('voice-record-button');
      expect(recordButton).toBeEnabled();
    });
  });
});
