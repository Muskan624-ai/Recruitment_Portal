'use client';

import React from 'react';
import { Html, useProgress } from '@react-three/drei';

/**
 * Lightweight progressive preloader inside <Suspense fallback={<MonumentLoader />}>
 * using <Html center> from @react-three/drei.
 */
export function MonumentLoader() {
  const { progress } = useProgress();

  return (
    <Html center>
      <div className="w-64 p-5 rounded-xl mv-panel flex flex-col items-center gap-3 text-center select-none pointer-events-none">
        <div className="relative w-8 h-8 flex items-center justify-center">
          <div className="w-6 h-6 rotate-45 border-2 border-[#EE6E93] animate-spin" />
          <div className="absolute w-2.5 h-2.5 rotate-45 bg-[#00897B]" />
        </div>

        <div className="w-full space-y-2">
          <p className="font-display text-xs font-semibold tracking-wider uppercase text-[#2A2E33]">
            The AI-ML Club • Recruitment 2026
          </p>
          <div className="w-full h-1.5 bg-[#E6DCD2] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#EE6E93] transition-all duration-150"
              style={{ width: `${Math.max(12, Math.round(progress))}%` }}
            />
          </div>
          <p className="font-sans text-xs text-[#6E7781] tabular-nums">
            Loading 3D Environment ({Math.round(progress)}%)
          </p>
        </div>
      </div>
    </Html>
  );
}
