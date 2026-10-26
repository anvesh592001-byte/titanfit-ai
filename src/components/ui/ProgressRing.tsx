import React from 'react';

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  unit?: string;
  accentColor?: string;
}

export function ProgressRing({
  value,
  max,
  size = 128,
  strokeWidth = 10,
  label,
  unit = '',
  accentColor = '#dc2626'
}: ProgressRingProps) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.min(100, Math.max(0, (value / safeMax) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90 transform"
          role="img"
          aria-label={`${label}: ${Math.round(value)}${unit} of ${Math.round(max)}${unit}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-zinc-200 dark:text-zinc-800"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={accentColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-bold tabular-nums text-zinc-900 dark:text-white">
            {Math.round(value)}
            {unit && <span className="text-xs font-normal text-zinc-400">{unit}</span>}
          </span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
            / {Math.round(max)}
            {unit}
          </span>
        </div>
      </div>
      <span className="mt-2 text-xs font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
        {label}
      </span>
    </div>
  );
}
