'use client';

import React, { useEffect } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';

export function SpatialHudDock() {
  const toastNotice = useGameStore((s) => s.toastNotice);
  const clearToast = useGameStore((s) => s.clearToast);
  const activeModal = useGameStore((s) => s.activeModal);
  const isMoving = useGameStore((s) => s.isMoving);
  const oauthVerified = useGameStore((s) => s.userProfile.oauthVerified);
  const isShortlisted = useGameStore((s) => s.isShortlisted);
  const isCameraZoomedOut = useGameStore((s) => s.isCameraZoomedOut);
  const toggleCameraZoomOut = useGameStore((s) => s.toggleCameraZoomOut);

  // Auto-dismiss toast notifications after 4.5 seconds
  useEffect(() => {
    if (!toastNotice) return;
    const timer = setTimeout(() => {
      clearToast();
    }, 4500);
    return () => clearTimeout(timer);
  }, [toastNotice, clearToast]);

  if (activeModal !== null) return null;

  const captionText = isMoving
    ? 'Navigating along the walkway...'
    : !oauthVerified
    ? 'Use Arrow Keys or WASD to guide the mascot to the front archway • Drag to orbit camera'
    : !isShortlisted
    ? 'Use Arrow Keys or WASD to climb the waterfall stairs & enter a selected domain doorway'
    : 'Use Arrow Keys or WASD to ascend the upper staircase to schedule your interview slot';

  return (
    <div className="fixed bottom-5 left-0 right-0 z-30 pointer-events-none px-4 flex flex-col items-center gap-2.5">
      {/* Warm Frosted Parchment Toast Banner */}
      {toastNotice && (
        <div
          onClick={clearToast}
          className="pointer-events-auto max-w-lg px-5 py-3 rounded-xl mv-hud-pill border border-[#EE6E93]/50 text-center transition-all cursor-pointer"
        >
          <p className="font-sans text-xs md:text-sm font-medium text-[#2A2E33]">
            {toastNotice.message}
          </p>
        </div>
      )}

      {/* Interactive Camera Zoom Toggle Button */}
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          type="button"
          onClick={toggleCameraZoomOut}
          className="mv-hud-pill px-4 py-2 flex items-center gap-2 font-sans text-xs font-semibold text-[#2A2E33] hover:border-[#EE6E93] transition-all cursor-pointer"
        >
          {isCameraZoomedOut ? (
            <>
              <Minimize2 className="w-3.5 h-3.5 text-[#00897B]" />
              <span>Zoom Into Mascot</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5 text-[#EE6E93]" />
              <span>Zoom Out Completely</span>
            </>
          )}
        </button>
      </div>

      {/* Subtle Guidance Pill */}
      <div className="px-4 py-1.5 rounded-full mv-hud-pill font-sans text-xs font-medium text-[#57606A] text-center">
        {captionText}
      </div>
    </div>
  );
}
