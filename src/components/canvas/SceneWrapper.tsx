'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const Scene = dynamic(() => import('./Scene'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-gradient-to-b from-[#009688] via-[#00BFA5] to-[#0ABFBC] flex flex-col items-center justify-center z-0">
      <div className="w-10 h-10 border-2 border-[#E0F7FA]/40 border-t-[#FFB300] rounded-full animate-spin mb-3" />
      <p className="font-mono text-[11px] tracking-widest uppercase text-[#E0F7FA]">
        INITIALIZING WATER PALACE GEOMETRY...
      </p>
    </div>
  ),
});

export function SceneWrapper() {
  return <Scene />;
}
