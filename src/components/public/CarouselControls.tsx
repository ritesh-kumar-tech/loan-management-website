import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

interface CarouselControlsProps {
  count: number;
  index: number;
  setIndex: (index: number) => void;
  label: string;
  intervalMs?: number;
  paused?: boolean;
}

export const useAutoCarousel = (count: number, intervalMs = 6000) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);

  useEffect(() => {
    if (count <= 1 || paused || userPaused) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [count, intervalMs, paused, userPaused]);

  return { index, setIndex, paused, setPaused, userPaused, setUserPaused };
};

export const CarouselControls: React.FC<CarouselControlsProps & { userPaused?: boolean; setUserPaused?: (paused: boolean) => void }> = ({
  count,
  index,
  setIndex,
  label,
  userPaused = false,
  setUserPaused,
}) => {
  if (count <= 1) return null;

  const go = (direction: number) => {
    setIndex((index + direction + count) % count);
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2" aria-label={`${label} indicators`}>
        {Array.from({ length: count }).map((_, dotIndex) => (
          <button
            key={dotIndex}
            onClick={() => setIndex(dotIndex)}
            className={`h-2.5 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
              dotIndex === index ? 'w-8 bg-blue-600' : 'w-2.5 bg-blue-200 hover:bg-blue-300'
            }`}
            aria-label={`Go to ${label} slide ${dotIndex + 1}`}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        {setUserPaused && (
          <button
            onClick={() => setUserPaused(!userPaused)}
            className="w-9 h-9 rounded-full bg-white/90 border border-blue-100 text-blue-700 shadow-sm grid place-items-center hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            aria-label={userPaused ? `Resume ${label} autoplay` : `Pause ${label} autoplay`}
          >
            {userPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
        )}
        <button
          onClick={() => go(-1)}
          className="w-11 h-11 rounded-full bg-white/95 border border-blue-100 text-blue-700 shadow-sm grid place-items-center hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          aria-label={`Previous ${label} slide`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => go(1)}
          className="w-11 h-11 rounded-full bg-white/95 border border-blue-100 text-blue-700 shadow-sm grid place-items-center hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          aria-label={`Next ${label} slide`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

