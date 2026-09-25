import React, { useEffect, useState } from 'react';

interface WaveformVisualizerProps {
  isPlaying: boolean;
  color?: string;
  barCount?: number;
  height?: number;
  className?: string;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  isPlaying,
  color = '#D6B15E',
  barCount = 18,
  height = 24,
  className = '',
}) => {
  const [heights, setHeights] = useState<number[]>(
    Array.from({ length: barCount }, () => Math.random() * 0.4 + 0.2),
  );

  useEffect(() => {
    if (!isPlaying) {
      setHeights(Array.from({ length: barCount }, () => 0.25));
      return;
    }

    const interval = setInterval(() => {
      setHeights(
        Array.from({ length: barCount }, () => Math.random() * 0.75 + 0.25),
      );
    }, 110);

    return () => clearInterval(interval);
  }, [isPlaying, barCount]);

  return (
    <div
      className="flex items-center gap-[2.5px] px-1"
      style={{ height: `${height}px` }}
    >
      {heights.map((h, i) => (
        <span
          key={i}
          className="rounded-full transition-all duration-100 ease-out"
          style={{
            height: `${Math.max(4, h * height)}px`,
            width: '2.5px',
            backgroundColor: color,
            opacity: isPlaying ? 0.9 : 0.4,
          }}
        />
      ))}
    </div>
  );
};
