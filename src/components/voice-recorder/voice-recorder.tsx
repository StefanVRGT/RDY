'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Play, Pause, Trash2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export type VoiceRecorderState = 'idle' | 'recording' | 'recorded';

export interface VoiceRecorderProps {
  onRecordingComplete?: (blob: Blob, duration: number) => void;
  onRecordingClear?: () => void;
  maxDuration?: number;
  className?: string;
  disabled?: boolean;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function VoiceRecorder({
  onRecordingComplete,
  onRecordingClear,
  maxDuration = 300,
  className,
  disabled = false,
}: VoiceRecorderProps) {
  const [state, setState] = useState<VoiceRecorderState>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingDurationRef = useRef<number>(0);
  const stopRecordingRef = useRef<() => void>(() => {});

  // Draw waveform visualization
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;

    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = 'rgb(245, 245, 245)'; // rdy-gray-100
    ctx.fillRect(0, 0, width, height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgb(243, 146, 55)'; // rdy-orange-500
    ctx.beginPath();

    const sliceWidth = width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(width, height / 2);
    ctx.stroke();

    if (state === 'recording') {
      animationFrameRef.current = requestAnimationFrame(drawWaveform);
    }
  }, [state]);

  // Draw static waveform from audio blob for playback
  const drawStaticWaveform = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBlob) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const audioContext = new AudioContext();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const channelData = audioBuffer.getChannelData(0);

      const width = canvas.width;
      const height = canvas.height;
      const step = Math.ceil(channelData.length / width);
      const amp = height / 2;

      ctx.fillStyle = 'rgb(245, 245, 245)'; // rdy-gray-100
      ctx.fillRect(0, 0, width, height);

      ctx.beginPath();
      ctx.moveTo(0, amp);

      for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;

        for (let j = 0; j < step; j++) {
          const datum = channelData[i * step + j];
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }

        // Draw progress indicator
        const progressX = playbackProgress * width;
        if (i < progressX) {
          ctx.strokeStyle = 'rgb(243, 146, 55)'; // rdy-orange-500 (played)
        } else {
          ctx.strokeStyle = 'rgb(189, 189, 189)'; // rdy-gray-300 (not played)
        }

        ctx.beginPath();
        ctx.moveTo(i, (1 + min) * amp);
        ctx.lineTo(i, (1 + max) * amp);
        ctx.stroke();
      }

      audioContext.close();
    } catch (err) {
      console.error('Failed to draw waveform:', err);
    }
  }, [audioBlob, playbackProgress]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up audio analyzer for visualization
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState('recorded');

        // Stop stream tracks
        stream.getTracks().forEach((track) => track.stop());

        // Notify parent component
        if (onRecordingComplete) {
          onRecordingComplete(blob, recordingDurationRef.current);
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setState('recording');
      setRecordingDuration(0);

      // Start drawing waveform
      drawWaveform();

      // Start duration counter
      recordingDurationRef.current = 0;
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((d) => {
          const newDuration = d + 1;
          recordingDurationRef.current = newDuration;
          if (newDuration >= maxDuration) {
            stopRecordingRef.current();
          }
          return newDuration;
        });
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Could not access microphone. Please check permissions.');
    }
  }, [maxDuration, drawWaveform, onRecordingComplete]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    }
  }, [state]);

  // Keep ref in sync with the callback
  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  // Clear recording
  const clearRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    // Stop playback if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingDuration(0);
    setPlaybackProgress(0);
    setIsPlaying(false);
    setState('idle');

    if (onRecordingClear) {
      onRecordingClear();
    }
  }, [audioUrl, onRecordingClear]);

  // Re-record
  const reRecord = useCallback(() => {
    clearRecording();
    // Small delay to ensure cleanup is complete
    setTimeout(() => {
      startRecording();
    }, 100);
  }, [clearRecording, startRecording]);

  // Toggle playback
  const togglePlayback = useCallback(() => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, audioUrl]);

  // Handle audio ended
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleEnded = () => {
        setIsPlaying(false);
        setPlaybackProgress(0);
      };

      const handleTimeUpdate = () => {
        if (audio.duration) {
          setPlaybackProgress(audio.currentTime / audio.duration);
        }
      };

      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('timeupdate', handleTimeUpdate);

      return () => {
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }
  }, [audioUrl]);

  // Draw static waveform when recorded
  useEffect(() => {
    if (state === 'recorded' && audioBlob) {
      drawStaticWaveform();
    }
  }, [state, audioBlob, playbackProgress, drawStaticWaveform]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [audioUrl]);

  return (
    <div className={cn('rounded-xl bg-rdy-gray-100 p-4', className)} data-testid="voice-recorder">
      {/* Error message */}
      {error && (
        <div
          className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-500"
          data-testid="voice-recorder-error"
        >
          {error}
        </div>
      )}

      {/* Waveform visualization */}
      <div className="mb-4">
        <canvas
          ref={canvasRef}
          width={280}
          height={60}
          className="w-full rounded-lg"
          data-testid="voice-recorder-waveform"
        />
      </div>

      {/* Controls */}
      {state === 'idle' && (
        <div className="flex items-center justify-center">
          <Button
            onClick={startRecording}
            disabled={disabled}
            className="gap-2 bg-rdy-orange-500 text-white hover:bg-rdy-orange-600"
            data-testid="voice-record-button"
          >
            <Mic className="h-4 w-4" />
            Start Recording
          </Button>
        </div>
      )}

      {state === 'recording' && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-3 w-3 animate-pulse rounded-full bg-red-500"
              data-testid="recording-indicator"
            />
            <span className="font-mono text-rdy-black" data-testid="recording-duration">
              {formatDuration(recordingDuration)}
            </span>
            <span className="text-xs text-rdy-gray-400">/ {formatDuration(maxDuration)}</span>
          </div>
          <Button
            onClick={stopRecording}
            variant="outline"
            className="gap-2 border-red-400 bg-red-50 text-red-500 hover:bg-red-100"
            data-testid="voice-stop-button"
          >
            <Square className="h-4 w-4" />
            Stop
          </Button>
        </div>
      )}

      {state === 'recorded' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                onClick={togglePlayback}
                size="sm"
                className="h-10 w-10 rounded-full bg-rdy-orange-500 p-0 hover:bg-rdy-orange-600"
                data-testid="voice-play-button"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
              </Button>
              <div>
                <p className="text-sm text-rdy-black">Voice Recording</p>
                <p className="text-xs text-rdy-gray-400" data-testid="voice-duration">
                  {formatDuration(recordingDuration)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={reRecord}
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-rdy-gray-400 hover:text-rdy-black"
                data-testid="voice-rerecord-button"
                title="Re-record"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                onClick={clearRecording}
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-rdy-gray-400 hover:text-red-500"
                data-testid="voice-clear-button"
                title="Delete recording"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Hidden audio element for playback */}
          <audio ref={audioRef} src={audioUrl || undefined} className="hidden" />
        </div>
      )}
    </div>
  );
}

export default VoiceRecorder;
