'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ScrollWheelTimePickerProps {
  value: string; // HH:MM format
  onChange: (time: string) => void;
  className?: string;
  use24Hour?: boolean;
}

// Generate arrays for picker options
const HOURS_12 = Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i));
const HOURS_24 = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const PERIODS = ['AM', 'PM'];

interface WheelColumnProps {
  options: (string | number)[];
  value: string | number;
  onChange: (value: string | number) => void;
  formatOption?: (value: string | number) => string;
  label?: string;
  testId?: string;
}

function WheelColumn({
  options,
  value,
  onChange,
  formatOption = (v) => String(v).padStart(2, '0'),
  label,
  testId,
}: WheelColumnProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const itemHeight = 48;
  const visibleItems = 5;
  const halfVisible = Math.floor(visibleItems / 2);

  const currentIndex = React.useMemo(() => {
    const idx = options.indexOf(value);
    return idx >= 0 ? idx : 0;
  }, [options, value]);

  const [scrollTop, setScrollTop] = React.useState(currentIndex * itemHeight);
  const scrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Sync scroll position when value changes externally
  React.useEffect(() => {
    if (containerRef.current) {
      const targetScrollTop = currentIndex * itemHeight;
      containerRef.current.scrollTop = targetScrollTop;
      setScrollTop(targetScrollTop);
    }
  }, [currentIndex, itemHeight]);

  const handleScroll = React.useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const newScrollTop = target.scrollTop;
      setScrollTop(newScrollTop);

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Debounce the value change
      scrollTimeoutRef.current = setTimeout(() => {
        const targetIndex = Math.round(newScrollTop / itemHeight);
        const clampedIndex = Math.max(0, Math.min(targetIndex, options.length - 1));
        const newValue = options[clampedIndex];

        if (newValue !== value) {
          onChange(newValue);
        }

        // Snap to closest item
        target.scrollTo({
          top: clampedIndex * itemHeight,
          behavior: 'smooth',
        });
      }, 100);
    },
    [itemHeight, onChange, options, value]
  );

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const handleItemClick = React.useCallback(
    (optionValue: string | number, index: number) => {
      onChange(optionValue);
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: index * itemHeight,
          behavior: 'smooth',
        });
      }
    },
    [itemHeight, onChange]
  );

  return (
    <div className="flex flex-col items-center" data-testid={testId}>
      {label && (
        <span className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </span>
      )}
      <div className="relative h-[240px] w-16 overflow-hidden">
        {/* Gradient overlays for depth effect */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-gray-900 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 bg-gradient-to-t from-gray-900 to-transparent" />

        {/* Selection highlight */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-5 h-12 -translate-y-1/2 rounded-lg border border-twilight-500/50 bg-twilight-500/20" />

        {/* Scrollable content */}
        <div
          ref={containerRef}
          className="h-full snap-y snap-mandatory overflow-y-auto scrollbar-hide"
          onScroll={handleScroll}
          style={{
            paddingTop: halfVisible * itemHeight,
            paddingBottom: halfVisible * itemHeight,
          }}
          data-testid={`${testId}-scroll-container`}
        >
          {options.map((option, index) => {
            const distanceFromCenter = Math.abs(
              index - Math.round(scrollTop / itemHeight)
            );
            const opacity = Math.max(0.3, 1 - distanceFromCenter * 0.25);
            const scale = Math.max(0.85, 1 - distanceFromCenter * 0.05);

            return (
              <button
                key={`${option}-${index}`}
                type="button"
                onClick={() => handleItemClick(option, index)}
                className={cn(
                  'flex h-12 w-full snap-center items-center justify-center text-xl font-semibold transition-all duration-150',
                  option === value ? 'text-white' : 'text-gray-400'
                )}
                style={{
                  opacity,
                  transform: `scale(${scale})`,
                }}
                data-testid={`${testId}-option-${option}`}
              >
                {formatOption(option)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ScrollWheelTimePicker({
  value,
  onChange,
  className,
  use24Hour = false,
}: ScrollWheelTimePickerProps) {
  // Parse the time value
  const { hours, minutes, period } = React.useMemo(() => {
    const [h, m] = value.split(':').map(Number);
    if (use24Hour) {
      return { hours: h, minutes: m, period: 'AM' };
    }
    const period = h >= 12 ? 'PM' : 'AM';
    const hours12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return { hours: hours12, minutes: m, period };
  }, [value, use24Hour]);

  const handleHoursChange = React.useCallback(
    (newHours: string | number) => {
      const h = Number(newHours);
      let hours24: number;

      if (use24Hour) {
        hours24 = h;
      } else {
        if (period === 'AM') {
          hours24 = h === 12 ? 0 : h;
        } else {
          hours24 = h === 12 ? 12 : h + 12;
        }
      }

      const newTime = `${String(hours24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      onChange(newTime);
    },
    [minutes, onChange, period, use24Hour]
  );

  const handleMinutesChange = React.useCallback(
    (newMinutes: string | number) => {
      const m = Number(newMinutes);
      let hours24: number;

      if (use24Hour) {
        hours24 = hours;
      } else {
        if (period === 'AM') {
          hours24 = hours === 12 ? 0 : hours;
        } else {
          hours24 = hours === 12 ? 12 : hours + 12;
        }
      }

      const newTime = `${String(hours24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      onChange(newTime);
    },
    [hours, onChange, period, use24Hour]
  );

  const handlePeriodChange = React.useCallback(
    (newPeriod: string | number) => {
      const p = String(newPeriod);
      let hours24: number;

      if (p === 'AM') {
        hours24 = hours === 12 ? 0 : hours;
      } else {
        hours24 = hours === 12 ? 12 : hours + 12;
      }

      const newTime = `${String(hours24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      onChange(newTime);
    },
    [hours, minutes, onChange]
  );

  return (
    <div
      className={cn('flex items-center justify-center gap-2', className)}
      data-testid="scroll-wheel-time-picker"
    >
      <WheelColumn
        options={use24Hour ? HOURS_24 : HOURS_12}
        value={hours}
        onChange={handleHoursChange}
        formatOption={(v) => String(v).padStart(2, '0')}
        label="Hour"
        testId="hour-wheel"
      />

      <span className="text-2xl font-bold text-gray-400">:</span>

      <WheelColumn
        options={MINUTES}
        value={minutes}
        onChange={handleMinutesChange}
        formatOption={(v) => String(v).padStart(2, '0')}
        label="Min"
        testId="minute-wheel"
      />

      {!use24Hour && (
        <WheelColumn
          options={PERIODS}
          value={period}
          onChange={handlePeriodChange}
          formatOption={(v) => String(v)}
          label=""
          testId="period-wheel"
        />
      )}
    </div>
  );
}

// Duration picker variant
interface ScrollWheelDurationPickerProps {
  value: number; // Duration in minutes
  onChange: (duration: number) => void;
  minDuration?: number;
  maxDuration?: number;
  step?: number;
  className?: string;
}

export function ScrollWheelDurationPicker({
  value,
  onChange,
  minDuration = 5,
  maxDuration = 120,
  step = 5,
  className,
}: ScrollWheelDurationPickerProps) {
  // Generate duration options based on min, max, and step
  const durationOptions = React.useMemo(() => {
    const options: number[] = [];
    for (let d = minDuration; d <= maxDuration; d += step) {
      options.push(d);
    }
    return options;
  }, [minDuration, maxDuration, step]);

  const formatDuration = React.useCallback((v: string | number) => {
    const minutes = Number(v);
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }, []);

  const handleChange = React.useCallback(
    (newValue: string | number) => {
      onChange(Number(newValue));
    },
    [onChange]
  );

  return (
    <div
      className={cn('flex items-center justify-center', className)}
      data-testid="scroll-wheel-duration-picker"
    >
      <WheelColumn
        options={durationOptions}
        value={value}
        onChange={handleChange}
        formatOption={formatDuration}
        label="Duration"
        testId="duration-wheel"
      />
    </div>
  );
}
