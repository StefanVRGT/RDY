'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Gauge,
  Sun,
  Cloud,
  CloudRain,
  Smile,
  Meh,
  Frown,
} from 'lucide-react';

interface MoodBarometerData {
  score: number; // 0-100
  positiveScore: number;
  negativeScore: number;
  trend: 'positive' | 'negative' | 'neutral';
}

interface MoodBarometerProps {
  data: MoodBarometerData;
  className?: string;
}

// Get mood description and icon based on score
function getMoodInfo(score: number) {
  if (score >= 75) {
    return {
      label: 'Excellent',
      description: 'You had a great week emotionally!',
      icon: Sun,
      color: 'text-green-400',
      bgColor: 'bg-green-500',
      gradientFrom: 'from-green-500',
      gradientTo: 'to-green-300',
      emoji: Smile,
    };
  }
  if (score >= 50) {
    return {
      label: 'Good',
      description: 'Overall positive emotional balance',
      icon: Cloud,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500',
      gradientFrom: 'from-yellow-500',
      gradientTo: 'to-yellow-300',
      emoji: Smile,
    };
  }
  if (score >= 25) {
    return {
      label: 'Mixed',
      description: 'Some ups and downs this week',
      icon: Cloud,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500',
      gradientFrom: 'from-orange-500',
      gradientTo: 'to-orange-300',
      emoji: Meh,
    };
  }
  return {
    label: 'Challenging',
    description: 'A tough week - take care of yourself',
    icon: CloudRain,
    color: 'text-red-400',
    bgColor: 'bg-red-500',
    gradientFrom: 'from-red-500',
    gradientTo: 'to-red-300',
    emoji: Frown,
  };
}

export function MoodBarometer({ data, className }: MoodBarometerProps) {
  const moodInfo = useMemo(() => getMoodInfo(data.score), [data.score]);

  // Calculate needle rotation (0 = left, 180 = right)
  const needleRotation = (data.score / 100) * 180 - 90;

  return (
    <div
      className={cn('rounded-xl bg-gray-900 p-4', className)}
      data-testid="mood-barometer"
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <Gauge className="h-5 w-5 text-twilight-400" />
        <h3 className="font-semibold text-white">Mood Barometer</h3>
      </div>

      {/* Gauge visualization */}
      <div className="relative mx-auto mb-4 h-40 w-64" data-testid="gauge-container">
        {/* Semi-circle background */}
        <svg
          viewBox="0 0 200 100"
          className="w-full h-full"
          style={{ overflow: 'visible' }}
        >
          {/* Background arc */}
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="25%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="75%" stopColor="#84cc16" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>

          {/* Background arc (gray) */}
          <path
            d="M 10 100 A 90 90 0 0 1 190 100"
            fill="none"
            stroke="#374151"
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Colored progress arc */}
          <path
            d="M 10 100 A 90 90 0 0 1 190 100"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${(data.score / 100) * 283} 283`}
            data-testid="gauge-progress"
          />

          {/* Tick marks */}
          {[0, 25, 50, 75, 100].map((tick) => {
            const angle = (tick / 100) * 180 - 90;
            const radian = (angle * Math.PI) / 180;
            const outerRadius = 90;
            const innerRadius = 80;
            const cx = 100;
            const cy = 100;

            const x1 = cx + innerRadius * Math.cos(radian);
            const y1 = cy + innerRadius * Math.sin(radian);
            const x2 = cx + outerRadius * Math.cos(radian);
            const y2 = cy + outerRadius * Math.sin(radian);

            return (
              <line
                key={tick}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#6b7280"
                strokeWidth="2"
              />
            );
          })}

          {/* Needle */}
          <g transform={`rotate(${needleRotation}, 100, 100)`}>
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="25"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              className="transition-all duration-500"
              data-testid="gauge-needle"
            />
            <circle cx="100" cy="100" r="8" fill="white" />
          </g>
        </svg>

        {/* Score labels */}
        <div className="absolute bottom-0 left-0 text-xs text-gray-500">0</div>
        <div className="absolute bottom-0 right-0 text-xs text-gray-500">100</div>
      </div>

      {/* Score display */}
      <div className="text-center mb-4" data-testid="score-display">
        <div className="flex items-center justify-center gap-2 mb-1">
          <moodInfo.emoji className={cn('h-6 w-6', moodInfo.color)} />
          <span className={cn('text-4xl font-bold', moodInfo.color)} data-testid="mood-score">
            {data.score}
          </span>
        </div>
        <p className={cn('text-lg font-medium', moodInfo.color)} data-testid="mood-label">
          {moodInfo.label}
        </p>
        <p className="text-sm text-gray-400" data-testid="mood-description">
          {moodInfo.description}
        </p>
      </div>

      {/* Positive/Negative breakdown */}
      <div
        className="rounded-lg bg-gray-800 p-3"
        data-testid="mood-breakdown"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Emotional Balance</span>
        </div>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-700">
          <div
            className="bg-green-500 transition-all duration-300"
            style={{
              width: `${data.positiveScore + data.negativeScore > 0
                ? (data.positiveScore / (data.positiveScore + data.negativeScore)) * 100
                : 50}%`
            }}
            data-testid="positive-bar"
          />
          <div
            className="bg-red-500 transition-all duration-300"
            style={{
              width: `${data.positiveScore + data.negativeScore > 0
                ? (data.negativeScore / (data.positiveScore + data.negativeScore)) * 100
                : 50}%`
            }}
            data-testid="negative-bar"
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-green-400" data-testid="positive-score">
            Positive: {data.positiveScore}
          </span>
          <span className="text-red-400" data-testid="negative-score">
            Negative: {data.negativeScore}
          </span>
        </div>
      </div>

      {/* Mood zones legend */}
      <div className="mt-4" data-testid="mood-legend">
        <p className="mb-2 text-xs font-medium text-gray-400">Mood Zones</p>
        <div className="flex justify-between text-[10px]">
          <div className="text-center">
            <div className="mx-auto mb-1 h-2 w-8 rounded bg-red-500" />
            <span className="text-gray-500">0-25</span>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-1 h-2 w-8 rounded bg-orange-500" />
            <span className="text-gray-500">25-50</span>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-1 h-2 w-8 rounded bg-yellow-500" />
            <span className="text-gray-500">50-75</span>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-1 h-2 w-8 rounded bg-green-500" />
            <span className="text-gray-500">75-100</span>
          </div>
        </div>
      </div>
    </div>
  );
}
